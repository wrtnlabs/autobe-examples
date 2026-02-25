import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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

export async function test_api_seller_profile_snapshot_create_with_null_logo_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins to obtain authorized admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Prepare profile snapshot creation data with logoImageUrl explicitly null
  const body: IShoppingMallSellerProfileSnapshot.ICreate = {
    shoppingMallSellerId: typia.random<string & tags.Format<"uuid">>(),
    shopName: "Test Shop Name",
    shopDescription: "Test shop description for seller profile snapshot.",
    logoImageUrl: null,
  };
  // 3. Create seller profile snapshot using admin connection
  const snapshot =
    await generate_random_shopping_mall_administrator_seller_profile_snapshots_create(
      adminConnection,
      { body },
    );
  typia.assert(snapshot);
  // 4. Validate that all fields are properly set
  TestValidator.equals(
    "shoppingMallSellerId",
    snapshot.shoppingMallSellerId,
    body.shoppingMallSellerId,
  );
  TestValidator.equals("shopName", snapshot.shopName, body.shopName);
  TestValidator.equals(
    "shopDescription",
    snapshot.shopDescription,
    body.shopDescription,
  );
  TestValidator.equals("logoImageUrl", snapshot.logoImageUrl, null);
  TestValidator.predicate(
    "id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  TestValidator.predicate(
    "createdAt is ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(snapshot.createdAt),
  );
}
