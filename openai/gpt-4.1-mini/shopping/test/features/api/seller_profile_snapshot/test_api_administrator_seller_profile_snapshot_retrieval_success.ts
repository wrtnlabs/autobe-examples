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

export async function test_api_administrator_seller_profile_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "AdminPass123!",
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Create a valid snapshot by calling the existing API is not possible here,
  // so simulate creation by generating a random valid snapshot
  const snapshot = typia.random<IShoppingMallSellerProfileSnapshot>();
  // 1. Retrieve the snapshot by valid ID
  const fetchedSnapshot =
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.at(
      adminConnection,
      { id: snapshot.id },
    );
  typia.assert(fetchedSnapshot);
  // Validate integrity and required fields
  TestValidator.equals(
    "snapshot belongs to seller",
    fetchedSnapshot.shoppingMallSellerId,
    snapshot.shoppingMallSellerId,
  );
  TestValidator.equals(
    "shopName matches",
    fetchedSnapshot.shopName,
    snapshot.shopName,
  );
  TestValidator.equals(
    "shopDescription matches",
    fetchedSnapshot.shopDescription,
    snapshot.shopDescription,
  );
  TestValidator.predicate(
    "createdAt is ISO8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      fetchedSnapshot.createdAt,
    ),
  );
  // Logo image URL can be nullable, if present check as string
  if (
    fetchedSnapshot.logoImageUrl !== null &&
    fetchedSnapshot.logoImageUrl !== undefined
  ) {
    TestValidator.predicate(
      "logoImageUrl is string",
      typeof fetchedSnapshot.logoImageUrl === "string",
    );
  }
  // Negative test: non-existent snapshot ID returns 404
  await TestValidator.httpError(
    "retrieve non-existent snapshot",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sellerProfileSnapshots.at(
        adminConnection,
        {
          id: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
