import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallIntegrationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallIntegrationEventLog";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallIntegrationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallIntegrationEventLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate advanced filtering, sorting, and pagination of integration event
 * logs for platform administrators.
 *
 * Business context:
 *
 * - Platform admins need to investigate external integration behavior, such as
 *   email providers and other downstream systems.
 * - They use /shoppingMall/platformAdmin/integrationEventLogs to query a
 *   time-bounded window of events filtered by provider type, status, HTTP
 *   status codes, and correlation/request identifiers.
 * - Results must be paginated and ordered consistently, typically by created_at
 *   DESC so that most recent events appear first.
 *
 * This test covers:
 *
 * 1. Creating and authenticating a platform admin.
 * 2. Creating and authenticating a customer, then exercising customer auth-related
 *    flows that are expected to emit integration events (email verification and
 *    password reset requests).
 * 3. As the platform admin, calling the integrationEventLogs.index PATCH endpoint
 *    with a rich filter set including time range, providerTypes, statuses,
 *    httpStatusCodes, and ordering by created_at DESC.
 * 4. Verifying that:
 *
 *    - Response structure (pagination + data) matches the DTO contracts.
 *    - All returned records respect the requested providerTypes, statuses, and
 *         httpStatusCodes filters (when those filters are provided).
 *    - Records are ordered by created_at in descending order.
 * 5. Narrowing the search using correlationIds/requestIds from one of the returned
 *    records and confirming that only matching events are returned and that
 *    pagination metadata is consistent.
 */
export async function test_api_platform_admin_integration_event_logs_advanced_filtering_and_sorting(
  connection: api.IConnection,
) {
  // Helper to create a random absolute URL for href/referrer
  const randomUrl = (): string & tags.Format<"uri"> =>
    typia.random<string & tags.Format<"uri">>();

  // -------------------------------------------------------------------------
  // 1. Register and authenticate a platform administrator
  // -------------------------------------------------------------------------
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoinOutput: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoinOutput);

  // Explicit login to exercise /auth/platformAdmin/login as dependency
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginOutput: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginOutput);

  // -------------------------------------------------------------------------
  // 2. Register and authenticate a customer
  // -------------------------------------------------------------------------
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerJoinOutput: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoinOutput);

  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
    userAgent: undefined,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginOutput: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginOutput);

  // -------------------------------------------------------------------------
  // 3. Generate integration events via customer auth flows
  // -------------------------------------------------------------------------
  // We cannot directly observe the logs here, but these calls should
  // create outbound events to email providers for verification and
  // password reset flows.

  // Trigger multiple password reset requests for variety
  const passwordResetEmails: string[] = [
    customerEmail,
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
  ];

  for (const email of passwordResetEmails) {
    const passwordResetBody = {
      email,
    } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

    const passwordResetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
      await api.functional.auth.customer.password.reset.request.requestPasswordReset(
        connection,
        { body: passwordResetBody },
      );
    typia.assert(passwordResetResult);
  }

  // Trigger several email verification attempts with random tokens
  const verificationTokens: string[] = ArrayUtil.repeat(3, () =>
    RandomGenerator.alphaNumeric(32),
  );

  for (const token of verificationTokens) {
    const verifyBody = {
      token,
    } satisfies IShoppingMallCustomerAuth.IVerifyEmail;

    const verifyResult: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.email.verify.verifyEmail(connection, {
        body: verifyBody,
      });
    typia.assert(verifyResult);
  }

  // -------------------------------------------------------------------------
  // 4. As platform admin, query integration event logs with advanced filters
  // -------------------------------------------------------------------------
  // Ensure we are authenticated as platform admin (login already set token).

  // Construct a time window roughly around now. We cannot directly tie event
  // timestamps to these values, but this is a realistic usage pattern.
  const now = new Date();
  const from = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const providerTypesFilter = ["email"] as string[];
  const statusesFilter = ["success", "failure"] as string[];
  const httpStatusCodesFilter: (number & tags.Type<"int32">)[] = [
    200 as number & tags.Type<"int32">,
    400 as number & tags.Type<"int32">,
    500 as number & tags.Type<"int32">,
  ];

  const page = 1 as number & tags.Type<"int32">;
  const limit = 20 as number & tags.Type<"int32">;

  const searchRequestBody = {
    page,
    limit,
    from: from as string & tags.Format<"date-time">,
    to: to as string & tags.Format<"date-time">,
    providerTypes: providerTypesFilter,
    statuses: statusesFilter,
    httpStatusCodes: httpStatusCodesFilter,
    orderBy: "created_at",
    orderDirection: "DESC",
  } satisfies IShoppingMallIntegrationEventLog.IRequest;

  const firstPage: IPageIShoppingMallIntegrationEventLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.integrationEventLogs.index(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(firstPage);

  const pagination = firstPage.pagination;
  const data = firstPage.data;

  // Basic pagination invariants
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    data.length <= pagination.limit,
  );

  // Filter consistency: providerTypes, statuses, httpStatusCodes
  for (const log of data) {
    // provider_type must be within providerTypesFilter
    TestValidator.predicate(
      "log.provider_type is within requested providerTypes",
      providerTypesFilter.includes(log.provider_type),
    );

    // status must be within statusesFilter
    TestValidator.predicate(
      "log.status is within requested statuses",
      statusesFilter.includes(log.status),
    );

    // When http_status_code is present, it must be one of httpStatusCodesFilter
    if (log.http_status_code !== null && log.http_status_code !== undefined) {
      TestValidator.predicate(
        "log.http_status_code is within requested httpStatusCodes",
        httpStatusCodesFilter.includes(log.http_status_code),
      );
    }
  }

  // Ordering by created_at DESC
  for (let i = 0; i + 1 < data.length; i++) {
    const a = data[i];
    const b = data[i + 1];
    const aCreated = Date.parse(a.created_at);
    const bCreated = Date.parse(b.created_at);

    TestValidator.predicate(
      "integration logs are ordered by created_at DESC",
      aCreated >= bCreated,
    );
  }

  // -------------------------------------------------------------------------
  // 5. Narrow filters using correlationIds/requestIds/provider ids
  // -------------------------------------------------------------------------
  if (data.length > 0) {
    const sample = data[0];

    let narrowRequest: IShoppingMallIntegrationEventLog.IRequest | null = null;

    if (sample.correlation_id !== null && sample.correlation_id !== undefined) {
      narrowRequest = {
        page,
        limit,
        from: from as string & tags.Format<"date-time">,
        to: to as string & tags.Format<"date-time">,
        providerTypes: providerTypesFilter,
        statuses: statusesFilter,
        httpStatusCodes: httpStatusCodesFilter,
        correlationIds: [sample.correlation_id],
        orderBy: "created_at",
        orderDirection: "DESC",
      } satisfies IShoppingMallIntegrationEventLog.IRequest;
    } else if (sample.request_id !== null && sample.request_id !== undefined) {
      narrowRequest = {
        page,
        limit,
        from: from as string & tags.Format<"date-time">,
        to: to as string & tags.Format<"date-time">,
        providerTypes: providerTypesFilter,
        statuses: statusesFilter,
        httpStatusCodes: httpStatusCodesFilter,
        requestIds: [sample.request_id],
        orderBy: "created_at",
        orderDirection: "DESC",
      } satisfies IShoppingMallIntegrationEventLog.IRequest;
    } else if (
      sample.provider_request_id !== null &&
      sample.provider_request_id !== undefined
    ) {
      narrowRequest = {
        page,
        limit,
        from: from as string & tags.Format<"date-time">,
        to: to as string & tags.Format<"date-time">,
        providerTypes: providerTypesFilter,
        statuses: statusesFilter,
        httpStatusCodes: httpStatusCodesFilter,
        providerRequestIds: [sample.provider_request_id],
        orderBy: "created_at",
        orderDirection: "DESC",
      } satisfies IShoppingMallIntegrationEventLog.IRequest;
    } else if (
      sample.provider_response_id !== null &&
      sample.provider_response_id !== undefined
    ) {
      narrowRequest = {
        page,
        limit,
        from: from as string & tags.Format<"date-time">,
        to: to as string & tags.Format<"date-time">,
        providerTypes: providerTypesFilter,
        statuses: statusesFilter,
        httpStatusCodes: httpStatusCodesFilter,
        providerResponseIds: [sample.provider_response_id],
        orderBy: "created_at",
        orderDirection: "DESC",
      } satisfies IShoppingMallIntegrationEventLog.IRequest;
    }

    if (narrowRequest !== null) {
      const narrowPage: IPageIShoppingMallIntegrationEventLog.ISummary =
        await api.functional.shoppingMall.platformAdmin.integrationEventLogs.index(
          connection,
          {
            body: narrowRequest,
          },
        );
      typia.assert(narrowPage);

      const narrowPagination = narrowPage.pagination;
      const narrowData = narrowPage.data;

      TestValidator.predicate(
        "narrow query pagination.records is >= narrowData.length",
        narrowPagination.records >= narrowData.length,
      );

      // Ensure each record matches the identifier we filtered on
      for (const log of narrowData) {
        if (narrowRequest.correlationIds !== undefined) {
          TestValidator.equals(
            "log.correlation_id equals filtered correlationId",
            log.correlation_id,
            narrowRequest.correlationIds[0] ?? null,
          );
        } else if (narrowRequest.requestIds !== undefined) {
          TestValidator.equals(
            "log.request_id equals filtered requestId",
            log.request_id,
            narrowRequest.requestIds[0] ?? null,
          );
        } else if (narrowRequest.providerRequestIds !== undefined) {
          TestValidator.equals(
            "log.provider_request_id equals filtered providerRequestId",
            log.provider_request_id,
            narrowRequest.providerRequestIds[0] ?? null,
          );
        } else if (narrowRequest.providerResponseIds !== undefined) {
          TestValidator.equals(
            "log.provider_response_id equals filtered providerResponseId",
            log.provider_response_id,
            narrowRequest.providerResponseIds[0] ?? null,
          );
        }
      }
    }
  }
}
