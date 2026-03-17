import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create";
import { prepare_random_shopping_mall_seller_profile_purchase_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_purchase_snapshot";

export async function test_api_seller_profile_purchase_snapshot_create_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    shop_name: `purchase-time-shop-${RandomGenerator.alphabets(8)}`,
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerProfilePurchaseSnapshot.ICreate;
  const snapshot =
    await generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create(
      customerConnection,
      {
        params: {
          orderId,
          itemId,
        },
        body,
      },
    );
  typia.assert(snapshot);
  TestValidator.notEquals(
    "snapshot id should be newly generated",
    snapshot.id,
    orderId,
  );
  TestValidator.notEquals(
    "snapshot id should differ from order item id",
    snapshot.id,
    itemId,
  );
  TestValidator.equals(
    "shop name should preserve submitted purchase-time value",
    snapshot.shop_name,
    body.shop_name,
  );
  TestValidator.equals(
    "logo uri should preserve submitted purchase-time value",
    snapshot.logo_uri,
    body.logo_uri ?? null,
  );
  TestValidator.equals(
    "embedded order item should point to targeted item",
    snapshot.orderItem.id,
    itemId,
  );
  TestValidator.predicate(
    "created_at should be populated",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be populated",
    snapshot.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should remain null on creation",
    snapshot.deleted_at,
    null,
  );
}
