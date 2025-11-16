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

export async function test_api_seller_cancellation_request_update_for_own_segment(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerSummary = sellerAuth.seller;

  // 2. Create product owned by seller
  const productCode = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerSummary.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product seller linkage",
    product.seller.id,
    sellerSummary.id,
  );
  TestValidator.equals("product code", product.code, productCode);

  // 3. Create option type for the product
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    // plain number is fine; tag intersections are compile-time only
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 4. Create option value for the option type
  const optionValueCreateBody = {
    value: "L",
    display_name: "Large",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 5. Create SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(10);

  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} - ${optionValue.display_name ?? optionValue.value}`,
    listPrice: 10_000,
    salePrice: 9_000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  TestValidator.equals(
    "sku product code linkage",
    sku.productCode,
    product.code,
  );

  // 6. Create inventory for SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10,
    low_stock_threshold: 1,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);

  TestValidator.equals(
    "inventory sku linkage",
    inventory.product_sku_id,
    sku.id,
  );

  // 7. Register customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerSummary = customerAuth.customer;

  // 8. Create customer cart (simple fixed region/currency)
  const cartCreateBody = {
    currency_code: sku.currency,
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  TestValidator.equals(
    "cart customer linkage",
    cart.customer.id,
    customerSummary.id,
  );

  // 9. Add SKU to cart
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
    note: "test line item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  TestValidator.equals(
    "cart item cart linkage",
    cartItem.customerCartId,
    cart.id,
  );

  // 10. Create order from cart
  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.equals(
    "order customer linkage",
    order.customer.id,
    customerSummary.id,
  );

  // 11. Customer creates cancellation request
  const cancellationCreateBody = {
    request_reason_category: "changed_mind",
    request_reason_detail: "Customer changed mind before shipment",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellationRequest: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert(cancellationRequest);

  TestValidator.equals(
    "cancellation request order linkage",
    cancellationRequest.order.id,
    order.id,
  );

  // Do not rely on specific literal value of actor_type; just ensure non-empty
  TestValidator.predicate(
    "cancellation actor_type is non-empty",
    cancellationRequest.actor_type.length > 0,
  );

  // 12. Switch back to seller auth (login)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 13. Seller updates cancellation request reason fields
  const sellerUpdateBody = {
    request_reason_category: "seller_segment_update",
    request_reason_detail: "Seller clarifies reason: stock realignment",
  } satisfies IShoppingMallOrderCancellationRequest.IUpdate;

  const updatedBySeller: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.seller.orders.cancellationRequests.update(
      connection,
      {
        orderId: order.id,
        cancellationRequestId: cancellationRequest.id,
        body: sellerUpdateBody,
      },
    );
  typia.assert(updatedBySeller);

  // Business assertions: linkage and updated fields
  TestValidator.equals(
    "updated cancellation still linked to same order",
    updatedBySeller.order.id,
    order.id,
  );

  TestValidator.equals(
    "updated reason category reflects seller change",
    updatedBySeller.request_reason_category,
    sellerUpdateBody.request_reason_category,
  );
  TestValidator.equals(
    "updated reason detail reflects seller change",
    updatedBySeller.request_reason_detail,
    sellerUpdateBody.request_reason_detail,
  );

  TestValidator.equals(
    "seller summary present on updated request",
    updatedBySeller.seller?.id ?? null,
    sellerSummary.id,
  );

  TestValidator.predicate(
    "request status remains non-terminal (not resolved)",
    () =>
      updatedBySeller.resolved_at === null ||
      updatedBySeller.resolved_at === undefined,
  );

  // 14. Negative case: seller attempts to update cancellation request for unrelated order
  const randomOtherOrderId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "seller cannot update cancellation request for unrelated order",
    async () => {
      await api.functional.shoppingMall.seller.orders.cancellationRequests.update(
        connection,
        {
          orderId: randomOtherOrderId,
          cancellationRequestId: cancellationRequest.id,
          body: {
            request_reason_category: "should_fail",
            request_reason_detail: "This should not be allowed",
          } satisfies IShoppingMallOrderCancellationRequest.IUpdate,
        },
      );
    },
  );
}
