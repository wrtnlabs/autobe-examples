import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Ensure seller-scoped visibility for order cancellation requests.
 *
 * This E2E scenario verifies that a seller can view a cancellation request only
 * for orders that belong to its own seller segment, and that another seller who
 * does not own the order cannot access the same cancellation request detail via
 * the seller-scoped endpoint.
 *
 * Business flow:
 *
 * 1. Register Seller A and Seller B.
 * 2. Register a Customer.
 * 3. As Seller A, create a product, option type, option value, SKU, and inventory
 *    so that the SKU is purchasable.
 * 4. As the Customer, create a cart, add Seller A's SKU as an item, and create an
 *    order from the cart.
 * 5. As the Customer, create a cancellation request for that order.
 * 6. As Seller A, fetch the cancellation request detail successfully and validate
 *    that it is tied to the correct order and reason category.
 * 7. As Seller B, attempt to fetch the same cancellation request detail and assert
 *    that the call fails (authorization boundary is enforced).
 */
export async function test_api_seller_cancellation_request_detail_for_non_owned_order_denied(
  connection: api.IConnection,
) {
  // 1. Register Seller A with a reusable password
  const sellerAPassword: string = RandomGenerator.alphaNumeric(12);
  const sellerAEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerAJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      storeName: RandomGenerator.name(2),
      contactPhone: RandomGenerator.mobile(),
    } satisfies IShoppingMallSellerJoin.IRequest,
  });
  typia.assert(sellerAJoin);

  // 2. Register Seller B with its own password
  const sellerBPassword: string = RandomGenerator.alphaNumeric(12);
  const sellerBEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      storeName: RandomGenerator.name(2),
      contactPhone: RandomGenerator.mobile(),
    } satisfies IShoppingMallSellerJoin.IRequest,
  });
  typia.assert(sellerBJoin);

  // 3. Register Customer with a reusable password
  const customerPassword: string = RandomGenerator.alphaNumeric(12);
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(2),
      ip: null,
      href: "https://customer.example.com/join",
      referrer: "https://customer.example.com/landing",
    } satisfies IShoppingMallCustomerAuth.IJoin,
  });
  typia.assert(customerJoin);

  // 4. Login as Seller A to create catalog resources
  const sellerALogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      ip: null,
      href: "https://seller-a.example.com/login",
      referrer: "https://seller-a.example.com/landing",
    } satisfies IShoppingMallSellerLogin.IRequest,
  });
  typia.assert(sellerALogin);

  // 5. Create product for Seller A
  const productCode = RandomGenerator.alphaNumeric(8);
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerALogin.id,
        shopping_mall_brand_id: undefined,
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        short_description: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        is_multi_sku: true,
        primary_image_uri: undefined,
        additional_data: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Create option type under the product
  const optionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: {
          name: "Color",
          display_name: "Color",
          display_order: 0,
        } satisfies IShoppingMallProductOptionType.ICreate,
      },
    );
  typia.assert(optionType);

  // 7. Create option value under the option type
  const optionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: {
          value: "red",
          display_name: "Red",
          display_order: 0,
          is_active: true,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValue);

  // 8. Create SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        code: skuCode,
        name: `${product.name} - ${optionValue.display_name ?? optionValue.value}`,
        listPrice: 10000,
        salePrice: 9000,
        currency: "KRW",
        isActive: true,
        isPurchasable: true,
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 9. Create inventory item for the SKU so it can be ordered
  const inventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: {
        product_sku_id: sku.id,
        on_hand_quantity: 10,
        low_stock_threshold: 1,
        backorder_enabled: false,
        preorder_enabled: false,
      } satisfies IShoppingMallInventoryItem.ICreate,
    });
  typia.assert(inventoryItem);

  // 10. Login as customer to create cart and order
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://customer.example.com/login",
      referrer: "https://customer.example.com/landing",
      userAgent: "E2E-Customer-Agent",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });
  typia.assert(customerLogin);

  // 11. Create customer cart
  const cart = await api.functional.shoppingMall.customer.customerCarts.create(
    connection,
    {
      body: {
        currency_code: "KRW",
        region_code: "KR-Seoul",
        channel: "web",
        metadata: undefined,
        is_active: true,
        source_guest_token: undefined,
      } satisfies IShoppingMallCustomerCart.ICreate,
    },
  );
  typia.assert(cart);

  // 12. Add cart item referencing Seller A's SKU
  const cartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: {
          skuId: sku.id,
          quantity: 1,
          note: null,
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 13. Create order from cart
  const itemsSubtotal = sku.salePrice * cartItem.quantity;
  const discountAmount = 0;
  const shippingAmount = 0;
  const taxAmount = 0;
  const grandTotal =
    itemsSubtotal - discountAmount + shippingAmount + taxAmount;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        customer_cart_id: cart.id,
        currency_code: cart.currency_code,
        items_subtotal_amount: itemsSubtotal,
        discount_total_amount: discountAmount,
        shipping_total_amount: shippingAmount,
        tax_total_amount: taxAmount,
        grand_total_amount: grandTotal,
        shipping_address_id: shippingAddressId,
        billing_address_id: billingAddressId,
        customer_note: "E2E test order for cancellation visibility",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 14. Create cancellation request as customer
  const cancellation =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: {
          request_reason_category: "changed_mind",
          request_reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IShoppingMallOrderCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellation);

  // 15. Login as Seller A to view cancellation request (happy path)
  const sellerALogin2 = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      ip: null,
      href: "https://seller-a.example.com/login",
      referrer: "https://seller-a.example.com/landing",
    } satisfies IShoppingMallSellerLogin.IRequest,
  });
  typia.assert(sellerALogin2);

  const sellerAView =
    await api.functional.shoppingMall.seller.orders.cancellationRequests.at(
      connection,
      {
        orderId: order.id,
        cancellationRequestId: cancellation.id,
      },
    );
  typia.assert(sellerAView);

  TestValidator.equals(
    "seller A sees cancellation for same order",
    sellerAView.order.id,
    order.id,
  );

  TestValidator.equals(
    "cancellation reason category matches",
    sellerAView.request_reason_category,
    cancellation.request_reason_category,
  );

  // 16. Login as Seller B and ensure access is denied for non-owned order
  const sellerBLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      ip: null,
      href: "https://seller-b.example.com/login",
      referrer: "https://seller-b.example.com/landing",
    } satisfies IShoppingMallSellerLogin.IRequest,
  });
  typia.assert(sellerBLogin);

  await TestValidator.error(
    "seller B cannot view seller A cancellation request",
    async () => {
      await api.functional.shoppingMall.seller.orders.cancellationRequests.at(
        connection,
        {
          orderId: order.id,
          cancellationRequestId: cancellation.id,
        },
      );
    },
  );
}
