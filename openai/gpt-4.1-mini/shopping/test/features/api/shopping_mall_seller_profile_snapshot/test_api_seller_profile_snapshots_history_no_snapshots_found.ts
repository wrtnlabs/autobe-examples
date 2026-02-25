import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_profile_snapshots_create } from "../../../generate/generate_random_shopping_mall_administrator_seller_profile_snapshots_create";
import { prepare_random_shopping_mall_seller_profile_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_snapshot";

export async function test_api_seller_profile_snapshots_history_no_snapshots_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secureP@ssw0rd",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Query sellerProfileSnapshots history with a sellerId that does not exist
  // Use a random UUID that is unlikely to have snapshots
  const fakeSellerId = typia.random<string & tags.Format<"uuid">>();
  const searchInput: IShoppingMallSellerProfileSnapshot.IRequest = {
    sellerId: fakeSellerId,
    offset: 0,
    limit: 10,
    page: 1,
  };
  const output =
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.history.index(
      adminConnection,
      {
        body: searchInput,
      },
    );
  // Assertions
  typia.assert(output);
  // Pagination must be correct
  TestValidator.predicate(
    "pagination current page is 1",
    output.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    output.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is 0",
    output.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages count is 0",
    output.pagination.pages === 0,
  );
  // Data must be empty array
  TestValidator.equals("data array is empty", output.data, []);
}
