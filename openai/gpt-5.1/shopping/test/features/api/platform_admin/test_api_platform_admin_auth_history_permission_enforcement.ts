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

export async function test_api_platform_admin_auth_history_permission_enforcement(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 2. Attempt to call authHistory.index without authentication and expect error
  await TestValidator.error(
    "unauthenticated access to platform admin auth history must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.authHistory.index(
        unauthenticated,
        {
          platformAdminId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
            actor_type: "platformAdmin",
          } satisfies IShoppingMallAuthLog.IRequest,
        },
      );
    },
  );

  // 3. Register a new platform admin (this will also authenticate and set Authorization header)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  const platformAdminId: string & tags.Format<"uuid"> = admin.id;

  // 4. Optionally generate some auth-related activity by requesting a customer password reset
  const resetBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      { body: resetBody },
    );
  typia.assert(resetResult);

  // 5. Call authHistory.index again with authenticated platform admin context
  const requestBody = {
    page: 1,
    limit: 20,
    actor_type: "platformAdmin",
    actor_id: platformAdminId,
  } satisfies IShoppingMallAuthLog.IRequest;

  const page: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.authHistory.index(
      connection,
      {
        platformAdminId,
        body: requestBody,
      },
    );
  typia.assert(page);

  // 6. Business logic validations
  TestValidator.predicate(
    "pagination current page must be non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records must be non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages must be non-negative",
    page.pagination.pages >= 0,
  );

  // If there are any records, they should match the requested actor filters
  for (const log of page.data) {
    TestValidator.equals(
      "auth log actorType must be platformAdmin",
      log.actorType,
      "platformAdmin",
    );
    if (log.actorId !== undefined) {
      TestValidator.equals(
        "auth log actorId must match requested platform admin id when present",
        log.actorId,
        platformAdminId,
      );
    }
  }
}
