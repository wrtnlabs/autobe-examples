import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function test_api_order_payment_retrieval_deleted_order(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        first_name: "Admin",
        last_name: "User",
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: "product" satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  const variant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product as any, // Cast to any to work around the string type definition
        body: "variant" satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        items: [
          {
            shopping_mall_product_variant_id: variant.id,
            quantity: 1,
          },
        ],
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // Soft-delete the order
  await api.functional.shoppingMall.admin.orders.erase(connection, {
    orderNumber: order.order_number,
  });

  // Try to retrieve payment details for deleted order - should return 404
  await TestValidator.error(
    "should return 404 for payment of deleted order",
    async () => {
      await api.functional.shoppingMall.admin.orders.payment.at(connection, {
        orderNumber: order.order_number,
      });
    },
  );
}
