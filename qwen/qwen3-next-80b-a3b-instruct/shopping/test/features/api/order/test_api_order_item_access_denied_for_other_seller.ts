import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_access_denied_for_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer actor
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create Seller A (product owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Create Seller B (attacker)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 4. Simulate order item creation from Seller A's product
  // We can't use API to create order item, so we use typia.random to generate valid IShoppingMallOrderItem
  // The item must have sellerId matching Seller A's ID
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem: IShoppingMallOrderItem = {
    orderId: orderId,
    sellerId: sellerA.id, // This matches Seller A, not Seller B
    productId: typia.random<string & tags.Format<"uuid">>(),
    variantId: typia.random<string & tags.Format<"uuid">>(),
    productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
    variantSnapshotId: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    priceAtTimeOfPurchase: typia.random<number & tags.Minimum<0>>(),
    status: "paid",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seller: {
      shop_name: RandomGenerator.name(),
      logo_url: "https://example.com/logo.jpg",
      status: "approved",
    },
    product: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.paragraph({ sentences: 2 }),
      base_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100>
      >(),
      category: {
        id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
      seller: {
        shop_name: RandomGenerator.name(),
        logo_url: "https://example.com/logo.jpg",
        status: "approved",
      },
      main_image_url: "https://example.com/image.jpg",
      avg_rating: typia.random<number & tags.Minimum<0> & tags.Maximum<5>>(),
      review_count: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
    },
    variant: {
      sku_code: "SKU-" + RandomGenerator.alphaNumeric(8),
      price: typia.random<(number & tags.Minimum<0>) | null | undefined>(),
      stock_quantity: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
    },
  };
  // 5. Seller B attempts to access order item owned by Seller A - should be forbidden
  await TestValidator.httpError(
    "seller B access denied for other seller's order item",
    403,
    async () => {
      await api.functional.shoppingMall.customer.orders.items.at(
        sellerBConnection,
        {
          orderId: orderId,
          itemId: itemId,
        },
      );
    },
  );
}
