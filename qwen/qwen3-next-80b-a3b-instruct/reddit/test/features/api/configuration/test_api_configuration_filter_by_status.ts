import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is now updated internally by authorize function
  // Step 2: Test filtering by status='active'
  const activeOnly =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(activeOnly);
  TestValidator.equals(
    "all configurations are active when filtered by status=active",
    activeOnly.data.every((c) => c.is_active === true),
    true,
  );
  // Step 3: Test filtering by status='inactive'
  const inactiveOnly =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          status: "inactive",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(inactiveOnly);
  TestValidator.equals(
    "all configurations are inactive when filtered by status=inactive",
    inactiveOnly.data.every((c) => c.is_active === false),
    true,
  );
  // Step 4: Test unfiltered request returns both active and inactive
  const allConfigs =
    await api.functional.communityPlatform.admin.configurations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(allConfigs);
  TestValidator.predicate(
    "both active and inactive configurations exist when unfiltered",
    () =>
      allConfigs.data.some((c) => c.is_active === true) &&
      allConfigs.data.some((c) => c.is_active === false),
  );
  // Step 5: Ensure there are configurations in both states
  TestValidator.predicate(
    "active configurations exist",
    () => activeOnly.data.length > 0,
  );
  TestValidator.predicate(
    "inactive configurations exist",
    () => inactiveOnly.data.length > 0,
  );
}
