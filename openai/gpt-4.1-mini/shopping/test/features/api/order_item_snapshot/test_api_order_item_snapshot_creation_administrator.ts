import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_order_item_snapshots_create_order_item_snapshot } from "../../../generate/generate_random_shopping_mall_administrator_order_item_snapshots_create_order_item_snapshot";
import { prepare_random_shopping_mall_order_item_snapshot } from "../../../prepare/prepare_random_shopping_mall_order_item_snapshot";

export async function test_api_order_item_snapshot_creation_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and obtains authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  // Update adminConnection headers with authorization token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Test successful creation of an immutable order item snapshot
  const validBody: IShoppingMallOrderItemSnapshot.ICreate = {
    shoppingMallOrderItemId: typia.random<string & tags.Format<"uuid">>(),
    shoppingMallOrderId: typia.random<string & tags.Format<"uuid">>(),
    productName: RandomGenerator.name(),
    variantSku: RandomGenerator.alphaNumeric(10),
    variantOptionValues: JSON.stringify({ color: "red", size: "M" }),
    unitPrice: typia.random<number & tags.Type<"double">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    itemStatus: "paid",
    sellerShopName: RandomGenerator.name(),
    sellerLogoUri: `https://example.com/logo/${RandomGenerator.alphabets(8)}.png`,
  };
  const createdSnapshot =
    await generate_random_shopping_mall_administrator_order_item_snapshots_create_order_item_snapshot(
      adminConnection,
      {
        body: validBody,
      },
    );
  typia.assert(createdSnapshot);
  // Assert all relevant fields match
  TestValidator.equals(
    "shoppingMallOrderItemId matches",
    createdSnapshot.shoppingMallOrderItemId,
    validBody.shoppingMallOrderItemId,
  );
  TestValidator.equals(
    "shoppingMallOrderId matches",
    createdSnapshot.shoppingMallOrderId,
    validBody.shoppingMallOrderId,
  );
  TestValidator.equals(
    "productName matches",
    createdSnapshot.productName,
    validBody.productName,
  );
  TestValidator.equals(
    "variantSku matches",
    createdSnapshot.variantSku,
    validBody.variantSku,
  );
  TestValidator.equals(
    "variantOptionValues matches",
    createdSnapshot.variantOptionValues,
    validBody.variantOptionValues,
  );
  TestValidator.equals(
    "unitPrice matches",
    createdSnapshot.unitPrice,
    validBody.unitPrice,
  );
  TestValidator.equals(
    "quantity matches",
    createdSnapshot.quantity,
    validBody.quantity,
  );
  TestValidator.equals(
    "itemStatus matches",
    createdSnapshot.itemStatus,
    validBody.itemStatus,
  );
  TestValidator.equals(
    "sellerShopName matches",
    createdSnapshot.sellerShopName,
    validBody.sellerShopName,
  );
  TestValidator.equals(
    "sellerLogoUri matches",
    createdSnapshot.sellerLogoUri ?? null,
    validBody.sellerLogoUri ?? null,
  );
  // Assert timestamps are present and valid ISO strings
  TestValidator.predicate(
    "createdAt is valid",
    typeof createdSnapshot.createdAt === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
        createdSnapshot.createdAt,
      ),
  );
  TestValidator.predicate(
    "updatedAt is valid",
    typeof createdSnapshot.updatedAt === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
        createdSnapshot.updatedAt,
      ),
  );
  // 3. Test failure case where shoppingMallOrderItemId does not exist
  await TestValidator.error(
    "non-existent shoppingMallOrderItemId",
    async () => {
      const badBody = {
        ...validBody,
        shoppingMallOrderItemId: "00000000-0000-0000-0000-000000000000",
      };
      await generate_random_shopping_mall_administrator_order_item_snapshots_create_order_item_snapshot(
        adminConnection,
        {
          body: badBody,
        },
      );
    },
  );
  // 4. Test failure case where shoppingMallOrderId does not exist
  await TestValidator.error("non-existent shoppingMallOrderId", async () => {
    const badBody = {
      ...validBody,
      shoppingMallOrderId: "00000000-0000-0000-0000-000000000000",
    };
    await generate_random_shopping_mall_administrator_order_item_snapshots_create_order_item_snapshot(
      adminConnection,
      {
        body: badBody,
      },
    );
  });
}
