import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_channel_list_search_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // Update connection with auth token
  superAdminConnection.headers = authResult.token.access
    ? { Authorization: authResult.token.access }
    : superAdminConnection.headers;
  // Step 2: Search channels with pagination and filtering
  const searchCriteria = {
    page: 1,
    limit: 2,
    name: "Tech",
    createdAfter: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
  } satisfies IShoppingMallChannel.IRequest;
  const result = await api.functional.shoppingMall.superAdmin.channels.index(
    superAdminConnection,
    { body: searchCriteria },
  );
  typia.assert(result);
  // Step 3: Validate results
  TestValidator.equals("page should be 1", result.pagination.current, 1);
  TestValidator.equals("limit should be 2", result.pagination.limit, 2);
  TestValidator.predicate(
    "results should be less than or equal to limit",
    result.data.length <= 2,
  );
  TestValidator.predicate(
    "all results should match name filter",
    result.data.every((channel) =>
      channel.name.toLowerCase().includes(searchCriteria.name!.toLowerCase()),
    ),
  );
  // Removed invalid createdAt validation since ISummary doesn't have this property
  // Step 4: Test empty result set
  const emptyCriteria = {
    page: 1,
    limit: 10,
    name: "NonExistentNameThatWillReturnZeroResults",
  } satisfies IShoppingMallChannel.IRequest;
  const emptyResult =
    await api.functional.shoppingMall.superAdmin.channels.index(
      superAdminConnection,
      { body: emptyCriteria },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result set should have 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result set should have empty data",
    emptyResult.data.length,
    0,
  );
  // Step 5: Test without filters (all channels)
  const allChannelsCriteria = {
    page: 1,
    limit: 100,
  } satisfies IShoppingMallChannel.IRequest;
  const allChannelsResult =
    await api.functional.shoppingMall.superAdmin.channels.index(
      superAdminConnection,
      { body: allChannelsCriteria },
    );
  typia.assert(allChannelsResult);
  TestValidator.predicate(
    "all channels should be returned",
    allChannelsResult.pagination.records > 0,
  );
}
