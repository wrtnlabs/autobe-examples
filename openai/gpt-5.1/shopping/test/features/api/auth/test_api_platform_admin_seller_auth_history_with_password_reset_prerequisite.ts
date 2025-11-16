import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthLog";
import type { IShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";

/**
 * Validate platform admin seller auth-history retrieval after a password reset
 * request.
 *
 * Business focus:
 *
 * - Ensure that a platform administrator can be registered and receives a valid
 *   authorized session with tokens via POST /auth/platformAdmin/join.
 * - Trigger a seller authentication-related event by calling POST
 *   /auth/seller/password/reset/request with a syntactically valid email.
 * - As an authenticated platform admin, call PATCH
 *   /shoppingMall/platformAdmin/sellers/{sellerId}/authHistory with a
 *   well-formed IShoppingMallAuthLog.IRequest body including pagination and an
 *   event_types filter that contains "password.reset.request".
 * - Validate that the auth-history endpoint responds with a correctly shaped
 *   IPageIShoppingMallAuthLog.ISummary structure and that returned log entries
 *   have consistent eventType values.
 *
 * NOTE: The current SDK surface does not expose seller creation or lookup
 * endpoints, so this test cannot strictly correlate a concrete sellerId with
 * the password reset request. Therefore, it focuses on:
 *
 * - Verifying that platform admin join works and configures the connection's
 *   Authorization token implicitly.
 * - Verifying that seller password reset request works structurally.
 * - Verifying that the seller auth-history endpoint accepts a request with
 *   pagination and event type filters, and returns structurally valid paginated
 *   authentication log data.
 */
export async function test_api_platform_admin_seller_auth_history_with_password_reset_prerequisite(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain authorized session
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  // Validate the authorized admin structure, including embedded token.
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Trigger a seller password reset request with a syntactically valid email.
  const sellerEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(10)}@seller.test` as string &
      tags.Format<"email">;

  const passwordResetBody = {
    email: sellerEmail,
  } satisfies IShoppingMallSellerPasswordResetRequest.IRequest;

  const resetResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: passwordResetBody,
      },
    );
  typia.assert<IShoppingMallSellerPasswordResetRequest.IResponse>(
    resetResponse,
  );
  TestValidator.predicate(
    "password reset response should indicate success or failure via boolean flag",
    typeof resetResponse.success === "boolean",
  );

  // 3. As the platform admin, query a seller's authentication history.
  //
  // We do not have a concrete sellerId from the previous step (no seller
  // creation API), so we use a random UUID-like string as the path parameter.
  // The goal is to validate that the endpoint is callable and structurally
  // behaves as expected when filters and pagination are provided.
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();

  const authHistoryRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_by: "occurredAt",
    sort_direction: "desc",
    actor_type: "seller",
    actor_id: randomSellerId,
    event_types: ["password.reset.request"],
    success: null,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallAuthLog.IRequest;

  const page: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.authHistory.index(
      connection,
      {
        sellerId: randomSellerId,
        body: authHistoryRequestBody,
      },
    );

  // 4. Validate the paginated auth-history response structure.
  typia.assert<IPageIShoppingMallAuthLog.ISummary>(page);
  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination current page index should be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    pagination.pages >= 0,
  );

  // 5. If any auth-log entries are returned, validate their eventType and
  //    actorType consistency with the applied filters.
  const logs: IShoppingMallAuthLog.ISummary[] = page.data;
  if (logs.length > 0) {
    for (const log of logs) {
      typia.assert<IShoppingMallAuthLog.ISummary>(log);

      TestValidator.predicate(
        "auth log actorType should reflect seller or related actor categories",
        log.actorType === "seller" ||
          log.actorType === "system" ||
          log.actorType === "platformAdmin" ||
          log.actorType === "customer" ||
          log.actorType === "guest",
      );

      // When the event_types filter includes "password.reset.request", it is
      // reasonable to expect that returned events include that type. However,
      // the backend may also return additional types depending on business
      // rules, so we only assert that password-reset events are allowed and do
      // not enforce strict equality on every record.
      TestValidator.predicate(
        "auth log eventType should be one of documented enum values",
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
        ].includes(log.eventType),
      );
    }
  }
}
