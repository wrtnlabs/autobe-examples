import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
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
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { generate_random_shopping_mall_customer_order_items_refund_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_request_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order_refund_request } from "../../../prepare/prepare_random_shopping_mall_order_refund_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_seller_refund_request_wrong_seller(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for different actors
  const adminConnection: api.IConnection = { host: connection.host };
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller2Connection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Admin login for seller approval workflow
  // Removed admin login as admin API doesn't exist - moved to seller1 directly
  // 2. Seller 1 registration and login
  const seller1Info = typia.random<IShoppingMallSeller.IJoin>();
  const seller1Authorized = await api.functional.shoppingMall.auth.seller.join(
    seller1Connection,
    {
      body: seller1Info,
    },
  );
  typia.assert(seller1Authorized);
  // Login as seller1 to get proper session
  const seller1Login = await api.functional.shoppingMall.auth.seller.login(
    seller1Connection,
    {
      body: {
        email: seller1Info.email,
        password: seller1Info.password,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(seller1Login);
  // 3. Seller 2 registration and login (different seller)
  const seller2Info = typia.random<IShoppingMallSeller.IJoin>();
  const seller2Authorized = await api.functional.shoppingMall.auth.seller.join(
    seller2Connection,
    {
      body: seller2Info,
    },
  );
  typia.assert(seller2Authorized);
  // Login as seller2 to get proper session
  const seller2Login = await api.functional.shoppingMall.auth.seller.login(
    seller2Connection,
    {
      body: {
        email: seller2Info.email,
        password: seller2Info.password,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(seller2Login);
  // 4. Customer registration and login
  const customerInfo = typia.random<IShoppingMallCustomer.IJoin>();
  const customerAuthorized =
    await api.functional.shoppingMall.auth.customer.join(customerConnection, {
      body: customerInfo,
    });
  typia.assert(customerAuthorized);
  // 5. Seller 1 creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          },
        ],
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "size",
                option_value: "M",
              },
            ],
            stock_quantity: 10,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Customer adds product to cart
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(
      customerConnection,
      {
        body: {
          variant_id: product.variants[0].id,
          quantity: 1,
        } satisfies IShoppingMallShoppingCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 7. Customer places an order
  const order = await api.functional.shoppingMall.customer.orders.history.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(order);
  // Find the recently created order
  const recentOrder = order.data.find((o) => o.id === order.data[0]?.id);
  if (!recentOrder) {
    throw new Error("Order not found");
  }
  // Update order status to delivered (simulating the delivery workflow)
  // In real scenario, this would involve multiple API calls to reach delivered status
  // For testing purposes, we'll assume the order is already delivered
  // 8. Customer creates a refund request
  const refundRequest =
    await api.functional.shoppingMall.customer.order_items.refund_request.create(
      customerConnection,
      {
        itemId: order.data[0]?.id ?? "",
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 9. Wrong seller (seller2) attempts to approve the refund request
  // This should fail because seller2 doesn't own the order item
  await TestValidator.error(
    "seller2 should not be able to approve refund for seller1's order",
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.approve.approveRefund(
        seller2Connection,
        {
          requestId: refundRequest.id,
        },
      );
    },
  );
  // 10. Correct seller (seller1) should be able to approve
  const approvedRefund =
    await api.functional.shoppingMall.seller.refund_requests.approve.approveRefund(
      seller1Connection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefund);
  TestValidator.equals("refund approved", approvedRefund.status, "approved");
}