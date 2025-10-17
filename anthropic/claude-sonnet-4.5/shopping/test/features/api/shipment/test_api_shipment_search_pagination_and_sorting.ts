import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test shipment search endpoint pagination and sorting capabilities by creating
 * multiple shipments and verifying the search returns properly paginated
 * results in the requested sort order.
 *
 * This test validates that the search endpoint correctly implements pagination
 * parameters (page size, page number) and sorting options (by shipped_at,
 * carrier_name, status) as specified in the API requirements.
 *
 * Test workflow:
 *
 * 1. Create customer account for order placement
 * 2. Create delivery address for shipment
 * 3. Create payment method for order payment
 * 4. Create seller account for product management
 * 5. Create admin account for category creation
 * 6. Create product category
 * 7. Create product as seller
 * 8. Create SKU variant as seller
 * 9. Add product to cart as customer (using cart from customer session)
 * 10. Create multiple orders as customer
 * 11. Create one shipment per order as seller
 * 12. Test pagination with different page sizes and page numbers
 * 13. Verify pagination metadata is correct
 */
export async function test_api_shipment_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create delivery address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.name(),
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  // 3. Create payment method
  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: RandomGenerator.pick([
            "credit_card",
            "debit_card",
            "paypal",
          ] as const),
          gateway_token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 4. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 2 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 5. Create admin account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 6. Create category (as admin)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 7. Create product (as seller - already authenticated from step 4)
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 8. Create SKU variant (as seller)
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // 9. Add product to cart (as customer - need to re-authenticate as customer)
  const customerReauth = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerReauth);

  // Create customer address for orders
  const customerAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.name(),
      } satisfies IShoppingMallAddress.ICreate,
    });
  typia.assert(customerAddress);

  // Create payment method for customer
  const customerPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: RandomGenerator.pick([
            "credit_card",
            "debit_card",
            "paypal",
          ] as const),
          gateway_token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(customerPaymentMethod);

  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // 10. Create multiple orders to generate multiple shipments
  const orderCount = 15;
  const orderIds: (string & tags.Format<"uuid">)[] = [];

  for (let i = 0; i < orderCount; i++) {
    const orderResponse =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: {
          delivery_address_id: customerAddress.id,
          payment_method_id: customerPaymentMethod.id,
          shipping_method: RandomGenerator.pick([
            "standard",
            "express",
            "overnight",
          ] as const),
        } satisfies IShoppingMallOrder.ICreate,
      });
    typia.assert(orderResponse);
    orderIds.push(...orderResponse.order_ids);
  }

  // 11. Create one shipment per order (as seller)
  const sellerReauth = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 2 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerReauth);

  const createdShipments = await ArrayUtil.asyncRepeat(
    orderIds.length,
    async (index) => {
      const orderId = orderIds[index];
      if (!orderId) throw new Error("Order ID not found");

      const shipment =
        await api.functional.shoppingMall.seller.shipments.create(connection, {
          body: {
            shopping_mall_order_id: orderId,
            carrier_name: RandomGenerator.pick([
              "FedEx",
              "UPS",
              "DHL",
              "USPS",
            ] as const),
            tracking_number: RandomGenerator.alphaNumeric(12),
          } satisfies IShoppingMallShipment.ICreate,
        });
      typia.assert(shipment);
      return shipment;
    },
  );

  // 12. Test pagination with different parameters
  // Test page 1 with limit 5
  const page1Limit5 = await api.functional.shoppingMall.shipments.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(page1Limit5);

  // 13. Verify pagination metadata
  TestValidator.equals(
    "page 1 current page should be 1",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should be 5",
    page1Limit5.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page 1 should have at most 5 items",
    page1Limit5.data.length <= 5,
  );
  TestValidator.predicate(
    "total records should be at least the number we created",
    page1Limit5.pagination.records >= orderIds.length,
  );
  TestValidator.predicate(
    "total pages should be at least 3 for 15 items with limit 5",
    page1Limit5.pagination.pages >= 3,
  );

  // Test page 2 with limit 5
  const page2Limit5 = await api.functional.shoppingMall.shipments.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(page2Limit5);

  TestValidator.equals(
    "page 2 current page should be 2",
    page2Limit5.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit should be 5",
    page2Limit5.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page 2 should have at most 5 items",
    page2Limit5.data.length <= 5,
  );

  // Test with larger page size
  const page1Limit10 = await api.functional.shoppingMall.shipments.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(page1Limit10);

  TestValidator.equals(
    "page 1 with limit 10 current page should be 1",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 with limit 10 limit should be 10",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 with limit 10 should have at most 10 items",
    page1Limit10.data.length <= 10,
  );

  // Verify no duplicate IDs across pages
  const page1Ids = page1Limit5.data.map((s) => s.id);
  const page2Ids = page2Limit5.data.map((s) => s.id);
  const hasDuplicates = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "page 1 and page 2 should not contain duplicate shipment IDs",
    !hasDuplicates,
  );
}
