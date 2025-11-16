import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPolicySetting";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

export async function test_api_platform_admin_policy_settings_search_requires_auth(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin to obtain an authenticated connection
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // At this point, the SDK join implementation has inserted the access token
  // into connection.headers.Authorization automatically.

  // 2. Seed at least one policy setting profile as the authenticated admin
  const createdPolicy: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: typia.random<IShoppingMallPolicySetting.ICreate>(),
      },
    );
  typia.assert(createdPolicy);

  // 3. Build a simple search request body using explicit object literal
  const searchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallPolicySetting.IRequest;

  // 4. Prepare an unauthenticated connection by cloning without headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 5. Unauthorized search: must fail with some HttpError (401/403 style),
  // but we do not assert on the exact status code.
  await TestValidator.error(
    "policy settings search requires auth",
    async () => {
      await api.functional.shoppingMall.platformAdmin.policySettings.index(
        unauthConnection,
        {
          body: searchRequest,
        },
      );
    },
  );

  // 6. Authorized search: using the authenticated admin connection should
  // succeed and return at least one policy record (the one we created).
  const page: IPageIShoppingMallPolicySetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.policySettings.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(page);

  // Validate pagination and data contents
  TestValidator.predicate(
    "pagination.records must be at least 1",
    page.pagination.records >= 1,
  );
  TestValidator.predicate(
    "data length must be at least 1",
    page.data.length >= 1,
  );
}
