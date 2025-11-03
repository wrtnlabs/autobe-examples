import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import type { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import type { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import type { IShoppingOrderLineFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLineFulfillment";
import type { IShoppingOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderPaymentAttempt";
import type { IShoppingOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderShipment";
import type { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validates seller order address retrieval permissions and correctness.
 *
 * - Ensures an authenticated seller can retrieve a shipping/billing address for
 *   their own fulfilled order.
 * - Ensures unrelated sellers (different accounts) cannot access order addresses
 *   not belonging to them.
 * - Ensures invalid (random or mismatched) order and address IDs are properly
 *   rejected.
 * - Verifies that the address data returned is fully complete and contains all
 *   required information for fulfillment purposes.
 * - Tests both 'shipping' and 'billing' types if present on the order.
 *
 * Steps:
 *
 * 1. Register Seller A.
 * 2. Seller A creates a Product.
 * 3. Seller A creates SKU under the product (with at least one variant).
 * 4. Register a Customer.
 * 5. Customer places a new order (covering all required fields, with both shipping
 *    and billing addresses if possible).
 * 6. Seller A retrieves the shipping or billing address for their order — succeeds
 *    and validates all fields.
 * 7. Register Seller B (unrelated seller).
 * 8. Seller B attempts to retrieve Seller A's order address — should fail (403/404
 *    or error thrown).
 * 9. Attempt to retrieve with wrong order code or wrong address ID — should also
 *    fail with error.
 */
export async function test_api_seller_order_address_retrieval(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerAEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(sellerA);

  // 2. Seller A creates a Product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://picsum.photos/500/500",
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Seller creates a SKU for the product
  // Select variant attribute ids or use dummy for minItems<1>
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 9900,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [RandomGenerator.alphaNumeric(6)], // Dummy value as required minItems = 1
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://test-href.com/checkout",
        referrer: "https://test-referrer.com/landing",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer creates an order (with both shipping and billing addresses)
  const shippingAddress: IShoppingOrderAddress.ICreate = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 4 }),
    detail_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: "Seoul",
    state_province: "Seoul",
    country: "Korea",
  };
  const billingAddress: IShoppingOrderAddress.ICreate = {
    type: "billing",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: RandomGenerator.alphaNumeric(5),
    base_address: RandomGenerator.paragraph({ sentences: 3 }),
    detail_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: "Seoul",
    state_province: "Seoul",
    country: "Korea",
  };
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: {
        total_price: sku.price,
        order_lines: [
          {
            shopping_sku_id: sku.id,
            quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            unit_price: sku.price as number & tags.Minimum<0>,
          },
        ],
        shipping_addresses: [shippingAddress, billingAddress],
        payment_method: "card",
      } satisfies IShoppingOrder.ICreate,
    });
  typia.assert(order);

  // Get both address IDs, should have both types
  const addressShipping = order.addresses.find(
    (addr) => addr.type === "shipping",
  );
  typia.assertGuard(addressShipping!);
  const addressBilling = order.addresses.find(
    (addr) => addr.type === "billing",
  );
  typia.assertGuard(addressBilling!);

  // 6. Seller A retrieves the shipping address (success case)
  const addressShippingRet: IShoppingOrderAddress =
    await api.functional.shopping.seller.orders.addresses.at(connection, {
      orderCode: order.order_code,
      orderAddressId: addressShipping.id,
    });
  typia.assert(addressShippingRet);
  TestValidator.equals(
    "shipping address fields must match order address",
    addressShippingRet,
    addressShipping,
  );

  // 6b. Seller A retrieves the billing address (success case)
  const addressBillingRet: IShoppingOrderAddress =
    await api.functional.shopping.seller.orders.addresses.at(connection, {
      orderCode: order.order_code,
      orderAddressId: addressBilling.id,
    });
  typia.assert(addressBillingRet);
  TestValidator.equals(
    "billing address fields must match order address",
    addressBillingRet,
    addressBilling,
  );

  // 7. Register Seller B (unrelated seller)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerBEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(sellerB);

  // 8. Seller B tries to retrieve address for Seller A order, should fail (forbidden)
  await TestValidator.error(
    "unauthorized seller must not access other seller's order address",
    async () => {
      await api.functional.shopping.seller.orders.addresses.at(connection, {
        orderCode: order.order_code,
        orderAddressId: addressShipping.id,
      });
    },
  );

  // 9. Try wrong orderCode — should fail
  await TestValidator.error(
    "retrieval with invalid orderCode must fail",
    async () => {
      await api.functional.shopping.seller.orders.addresses.at(connection, {
        orderCode: RandomGenerator.alphaNumeric(12), // random code, not real
        orderAddressId: addressShipping.id,
      });
    },
  );

  // 10. Try wrong addressId — should fail
  await TestValidator.error(
    "retrieval with invalid orderAddressId must fail",
    async () => {
      await api.functional.shopping.seller.orders.addresses.at(connection, {
        orderCode: order.order_code,
        orderAddressId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
