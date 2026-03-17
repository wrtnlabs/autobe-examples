import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test that a super administrator can successfully retrieve paginated order items for a specific seller.
 *
 * This test validates that:
 * 1. A super admin can access order items for any seller (ownership isolation bypass for admins)
 * 2. The response contains proper pagination metadata
 * 3. Order items include nested product, variant, and seller summaries
 * 4. All returned items belong to the specified seller
 */
export async function test_api_super_admin_seller_order_items_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin using join (no utility available, use SDK directly)
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // 2. Create seller account that will own products and order items
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Have the seller create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Create customer account to place orders
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 5. Create order by having the customer call checkout (creates order items associated with the seller)
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 6. Call PATCH /ecommerceMall/superAdmin/sellers/{sellerId}/orderItems with minimal filters (just pagination)
  const orderItemsResponse: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.superAdmin.sellers.orderItems.index(
      superAdminConnection,
      {
        sellerId: seller.id,
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsResponse);
  // 7. Verify the response returns a paginated list with proper structure
  // Verify pagination metadata exists
  TestValidator.predicate(
    "pagination metadata exists",
    !!orderItemsResponse.pagination,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(orderItemsResponse.data),
  );
  // Check if order items were returned (there might be other items or none if the checkout didn't link to our product)
  if (orderItemsResponse.data.length > 0) {
    const orderItem = orderItemsResponse.data[0];
    // Verify order item fields are populated
    TestValidator.predicate("order item has id", !!orderItem.id);
    TestValidator.predicate(
      "order item has quantity",
      typeof orderItem.quantity === "number" && orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "order item has priceAtPurchase",
      typeof orderItem.priceAtPurchase === "number" &&
        orderItem.priceAtPurchase >= 0,
    );
    TestValidator.predicate("order item has status", !!orderItem.status);
    TestValidator.predicate("order item has createdAt", !!orderItem.createdAt);
    // Verify nested product summary
    TestValidator.predicate("product exists", !!orderItem.product);
    TestValidator.predicate("product has name", !!orderItem.product?.name);
    // Verify nested variant summary
    TestValidator.predicate("variant exists", !!orderItem.variant);
    TestValidator.predicate(
      "variant has skuCode",
      !!orderItem.variant?.skuCode,
    );
    TestValidator.predicate(
      "variant has options",
      Array.isArray(orderItem.variant?.options),
    );
    // Verify nested seller summary matches the target seller
    TestValidator.predicate("seller exists", !!orderItem.seller);
    TestValidator.equals("seller id matches", orderItem.seller?.id, seller.id);
    // 8. Verify the order item status is 'paid' (initial state after checkout)
    TestValidator.equals("order item status is paid", orderItem.status, "paid");
  }
  // 9. Verify ownership isolation - all items returned belong only to the specified seller
  const allBelongToSeller = orderItemsResponse.data.every(
    (item) => item.seller?.id === seller.id,
  );
  TestValidator.predicate(
    "all items belong to specified seller",
    allBelongToSeller,
  );
}
