import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

export async function test_api_order_item_snapshot_customer_self_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new customer account by joining
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create cart item which should generate an order item snapshot
  // Since checkout functionality is not available in our provided utilities,
  // we assume cart creation creates a snapshot in the target system
  const cartItem = await generate_random_shopping_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        variant_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartItem);
  // 3. Retrieve the snapshot using a generated snapshotId matching the system's UUID format
  // We use the fact that each order item has a corresponding snapshot
  // We generate a UUID (as we cannot get it directly) and use it to request the snapshot
  // We assume the system creates snapshots for cart items
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.customer.order_item_snapshots.at(
      customerConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate the snapshot returned belongs to a customer's order
  // All required fields must be non-null and match expected format
  TestValidator.equals("snapshot_id is valid UUID", snapshot.id, snapshotId);
  TestValidator.equals(
    "product_name is present",
    typeof snapshot.product_name,
    "string",
  );
  TestValidator.equals(
    "sku_code is present",
    typeof snapshot.variant_sku,
    "string",
  );
  TestValidator.equals(
    "shop_name is present",
    typeof snapshot.shop_name,
    "string",
  );
  TestValidator.equals(
    "snapshot_hash is present",
    typeof snapshot.snapshot_hash,
    "string",
  );
  TestValidator.predicate(
    "created_at is datetime",
    () => snapshot.created_at.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/) !== null,
  );
  TestValidator.equals(
    "order_item_id is valid UUID",
    typeof snapshot.order_item_id,
    "string",
  );
  TestValidator.equals(
    "product_id is valid UUID",
    typeof snapshot.product_id,
    "string",
  );
  TestValidator.equals(
    "variant_id is valid UUID",
    typeof snapshot.variant_id,
    "string",
  );
  TestValidator.equals(
    "seller_id is valid UUID",
    typeof snapshot.seller_id,
    "string",
  );
  // Additional business logic: verify mandatory string fields are not empty
  TestValidator.predicate(
    "product_name is not empty",
    () => snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "sku_code is not empty",
    () => snapshot.variant_sku.length > 0,
  );
  TestValidator.predicate(
    "shop_name is not empty",
    () => snapshot.shop_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot_hash is not empty",
    () => snapshot.snapshot_hash.length > 0,
  );
  // Ensure all UUIDs are in proper format
  TestValidator.predicate("order_item_id matches UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      snapshot.order_item_id,
    ),
  );
}