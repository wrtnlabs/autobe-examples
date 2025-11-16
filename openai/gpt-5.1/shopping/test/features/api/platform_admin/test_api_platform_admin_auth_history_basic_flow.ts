import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthLog";
import type { IShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthLog";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Basic flow: platform admin auth history listing.
 *
 * This test validates that:
 *
 * - A platform administrator can be registered and automatically authenticated
 * - A customer password reset request can be triggered to generate auth logs
 * - The platform admin can query authentication history for a given platform
 *   admin id
 * - The auth history endpoint returns a paginated page of
 *   IShoppingMallAuthLog.ISummary
 * - Returned summaries have key fields populated and do not expose sensitive data
 *
 * Steps:
 *
 * 1. Join a new platform admin via POST /auth/platformAdmin/join
 * 2. Trigger a customer password reset request via POST
 *    /auth/customer/password/reset/request
 * 3. Query auth history via PATCH
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/authHistory
 * 4. Assert pagination metadata consistency and non-negative values
 * 5. If any records exist, validate core fields and ensure only non-sensitive
 *    metadata is present
 */
export async function test_api_platform_admin_auth_history_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (and authenticate connection)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(platformAdmin);

  // 2. Trigger a customer password reset request to create an auth log entry
  const resetBody = {
    email: `${RandomGenerator.alphabets(10)}@customer.example.com`,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetBody,
      },
    );
  typia.assert(resetResult);

  // 3. Query auth history for the platform admin
  const requestPage = 1 as number & tags.Type<"int32">; // 1-based request page per IRequest description
  const requestLimit = 10 as number & tags.Type<"int32">;

  const authHistoryRequest = {
    page: requestPage,
    limit: requestLimit,
  } satisfies IShoppingMallAuthLog.IRequest;

  const page: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.authHistory.index(
      connection,
      {
        platformAdminId: platformAdmin.id,
        body: authHistoryRequest,
      },
    );
  typia.assert(page);

  // 4. Assert pagination metadata is consistent and non-negative
  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination.current is non-negative and within pages range",
    () =>
      pagination.current >= 0 &&
      (pagination.pages === 0 || pagination.current < pagination.pages),
  );

  TestValidator.predicate(
    "pagination.limit is positive",
    () => pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination.records is non-negative",
    () => pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination.pages is non-negative",
    () => pagination.pages >= 0,
  );

  // 5. Validate at least that data is an array and check first record if present
  const data: IShoppingMallAuthLog.ISummary[] = page.data;
  typia.assert<IShoppingMallAuthLog.ISummary[]>(data);

  if (data.length > 0) {
    const first: IShoppingMallAuthLog.ISummary = data[0];
    typia.assert(first);

    // Core fields should be present and well-formed
    TestValidator.predicate("auth log id is non-empty", first.id.length > 0);
    TestValidator.predicate(
      "auth log actorType is one of allowed values",
      ["guest", "customer", "seller", "platformAdmin", "system"].includes(
        first.actorType,
      ),
    );
    TestValidator.predicate(
      "auth log eventType is one of allowed values",
      [
        "login.success",
        "login.failure",
        "logout",
        "token.refresh",
        "password.reset.request",
        "password.reset.success",
        "email.verification.request",
        "email.verification.success",
        "session.revoked",
        "credential.locked",
        "credential.unlocked",
        "other",
      ].includes(first.eventType),
    );
    TestValidator.predicate(
      "auth log status is one of allowed values",
      ["success", "failure", "blocked", "suspicious", "info"].includes(
        first.status,
      ),
    );

    // occurredAt should be a non-empty string; typia already validates date-time format
    TestValidator.predicate(
      "auth log occurredAt is non-empty",
      first.occurredAt.length > 0,
    );

    // 6. Ensure no sensitive fields are exposed by relying on the DTO shape:
    // we only access documented properties (id, actorType, actorId, eventType,
    // occurredAt, ip, userAgent, status) and do not see any password/token fields.
    TestValidator.equals(
      "auth log summary only exposes documented fields",
      Object.keys(first).sort(),
      Object.keys({
        id: first.id,
        actorType: first.actorType,
        actorId: first.actorId,
        eventType: first.eventType,
        occurredAt: first.occurredAt,
        ip: first.ip,
        userAgent: first.userAgent,
        status: first.status,
      }).sort(),
    );
  }
}
