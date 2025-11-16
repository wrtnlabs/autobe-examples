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

export async function test_api_platform_admin_seller_auth_history_filter_by_time_window(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain admin authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.mobile(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing/platform-admin",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Trigger an auth-related event for a seller via password reset request
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();

  const resetRequestBody = {
    email: sellerEmail,
  } satisfies IShoppingMallSellerPasswordResetRequest.IRequest;

  const resetResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetResponse);

  // 3. Prepare a time window around "now" for filtering logs
  const now = new Date();
  const fromDate = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes before
  const toDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes after
  const createdFrom = fromDate.toISOString();
  const createdTo = toDate.toISOString();

  // We do not know the real sellerId backing this email, so use a random UUID.
  // In simulate mode the SDK will still return valid data; in real mode, we only
  // assert that any returned records respect filters, not that there is at least one.
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();

  const requestBody = {
    page: 1,
    limit: 20,
    actor_type: "seller",
    actor_id: sellerId,
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallAuthLog.IRequest;

  const page: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.authHistory.index(
      connection,
      {
        sellerId,
        body: requestBody,
      },
    );
  typia.assert(page);

  // 4. Basic pagination sanity checks
  TestValidator.predicate(
    "pagination current page should be non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    page.pagination.pages >= 0,
  );

  // 5. Validate each auth log summary respects filters
  for (const log of page.data) {
    // Ensure actor type matches seller
    TestValidator.equals(
      "auth log actorType must be seller",
      log.actorType,
      "seller",
    );

    // If actorId is present, it must match the sellerId we queried for
    if (log.actorId !== undefined) {
      TestValidator.equals(
        "auth log actorId should match requested sellerId when defined",
        log.actorId,
        sellerId,
      );
    }

    // occurredAt must be within [createdFrom, createdTo]
    const occurred = new Date(log.occurredAt).getTime();
    const fromMs = new Date(createdFrom).getTime();
    const toMs = new Date(createdTo).getTime();

    TestValidator.predicate(
      "auth log occurredAt should be on or after created_from",
      occurred >= fromMs,
    );
    TestValidator.predicate(
      "auth log occurredAt should be on or before created_to",
      occurred <= toMs,
    );
  }
}
