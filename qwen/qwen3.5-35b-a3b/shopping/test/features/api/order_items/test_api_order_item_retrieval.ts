import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test super administrator order item retrieval functionality.
 *
 * Validates that super administrators can retrieve complete order item details
 * including product variant information, pricing, status, and seller attribution.
 * Tests the primary success path for order item access validation.
 *
 * The test creates a complete transaction flow: super administrator account setup,
 * seller product creation with variants, customer order placement, and finally
 * super administrator retrieval of the order item to verify platform oversight
 * capabilities. All pricing and variant data are frozen at purchase time
 * and correctly preserved in the order item record.
 *
 * 1. Super administrator account registration and authentication
 * 2. Customer account registration and authentication
 * 3. Seller account registration and authentication
 * 4. Product creation with variants by seller
 * 5. Order creation by customer containing product variant
 * 6. Order item retrieval by super administrator
 * 7. Comprehensive field validation including variant data, seller info, pricing
 * 8. Structure validation against IEcommerceMallOrderItem schema
 */
export async function test_api_order_item_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 4. Create product with variants
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Get the first variant from the product (may be empty in simulation)
  let variant: IEcommerceMallProductVariant.ISummary | undefined;
  if (product.variants.length > 0) {
    variant = product.variants[0];
  } else {
    // Generate a variant in simulation mode
    variant = typia.random<IEcommerceMallProductVariant.ISummary>();
  }
  // 5. Create order with the product variant
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id: variant.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item ID
  if (order.items.length === 0) {
    throw new Error("Order has no items");
  }
  const orderItemId = order.items[0].id;
  // 6. Retrieve order item as super administrator
  const orderItem =
    await api.functional.ecommerceMall.superAdministrator.order_items.at(
      superAdminConnection,
      {
        id: orderItemId,
      },
    );
  typia.assert(orderItem);
  // 7. Validate response structure
  TestValidator.equals("order item id", orderItem.id, orderItemId);
  TestValidator.equals(
    "order number matches",
    orderItem.order.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "quantity matches",
    orderItem.quantity,
    order.items[0].quantity,
  );
  TestValidator.equals(
    "unit price frozen",
    orderItem.unit_price,
    order.items[0].unit_price,
  );
  TestValidator.equals(
    "subtotal matches",
    orderItem.subtotal,
    order.items[0].subtotal,
  );
  TestValidator.equals("status is paid", orderItem.status, "paid");
  // 8. Validate variant data
  TestValidator.equals(
    "product name matches",
    orderItem.productVariant.product.name,
    product.name,
  );
  TestValidator.equals(
    "sku code matches",
    orderItem.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "option values preserved",
    orderItem.productVariant.option_values,
    variant.option_values,
  );
  // 9. Validate seller data
  TestValidator.equals(
    "seller display name matches",
    orderItem.seller.display_name,
    seller.display_name,
  );
  TestValidator.equals(
    "approval status is approved",
    orderItem.seller.approval_status,
    "approved",
  );
}
