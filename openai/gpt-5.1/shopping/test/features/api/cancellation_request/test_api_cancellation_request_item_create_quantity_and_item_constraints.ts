import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestItem";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCartValidationError } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationError";
import type { IShoppingMallCartValidationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationResult";
import type { IShoppingMallCartValidationWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationWarning";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_cancellation_request_item_create_quantity_and_item_constraints(
  connection: api.IConnection,
) {
  // 1. Admin, seller, customer join flows
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuth);

  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // Reuse a single currency across cart and order
  const currencyCode = "KRW";

  // 2. Admin creates country, region, category, skuInventoryState, shippingMethod, paymentMethod
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  const categoryCreateBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphabets(8)}`,
    name_en: "General",
    description_en: "General category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const invStateCreateBody = {
    code: `in_stock_${RandomGenerator.alphabets(4)}`,
    name: "In Stock",
    description: "Purchasable stock",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const invState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: invStateCreateBody,
      },
    );
  typia.assert(invState);

  const shippingMethodCreateBody = {
    method_code: `STD_${RandomGenerator.alphabets(4)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: `CARD_${RandomGenerator.alphabets(4)}`,
    display_name: "Credit Card",
    description: "Card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 3. Seller creates product and two SKUs
  const productCreateBody = {
    code: `PROD_${RandomGenerator.alphabets(6)}`,
    title: "Multi-SKU Product",
    summary: "Product with two SKUs",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    brand: "BrandX",
    model_name: "Model-1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  const skuBase = {
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: invState.id,
    attribute_value_ids: [],
    external_ids: [],
  };

  const sku1Body = {
    ...skuBase,
    code: `SKU1_${RandomGenerator.alphabets(4)}`,
    barcode: `BAR1_${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallSku.ICreate;
  const sku1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: sku1Body,
    });
  typia.assert(sku1);

  const sku2Body = {
    ...skuBase,
    code: `SKU2_${RandomGenerator.alphabets(4)}`,
    barcode: `BAR2_${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallSku.ICreate;
  const sku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: sku2Body,
    });
  typia.assert(sku2);

  // 4. Customer creates shipping address
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Doe",
    line1: "123 Test Street",
    line2: "Unit 101",
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: addressCreateBody,
      },
    );
  typia.assert(address);

  // 5. Customer creates cart
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: currencyCode,
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 6. Customer adds two cart items with different quantities
  const quantitySku1 = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const quantitySku2 = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const cartItem1Body = {
    shopping_mall_sku_id: sku1.id,
    quantity: quantitySku1,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem1: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItem1Body,
    });
  typia.assert(cartItem1);

  const cartItem2Body = {
    shopping_mall_sku_id: sku2.id,
    quantity: quantitySku2,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItem2Body,
    });
  typia.assert(cartItem2);

  // 7. Validate cart
  const validationResult: IShoppingMallCartValidationResult =
    await api.functional.shoppingMall.customer.carts.validate(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
    });
  typia.assert(validationResult);
  TestValidator.predicate(
    "cart should be valid before order creation",
    validationResult.isValid,
  );

  // 8. Create order from cart with two items
  const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: address.recipient_name,
      phone_number: address.phone_number ?? RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: address.postal_code,
      state_or_region: region.name_en,
      city: address.city,
      address_line1: address.line1,
      address_line2: address.line2 ?? null,
    };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: currencyCode,
    items: [
      {
        shopping_mall_sku_id: sku1.id,
        quantity: quantitySku1,
      },
      {
        shopping_mall_sku_id: sku2.id,
        quantity: quantitySku2,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.equals("order should contain two items", order.items.length, 2);

  const orderItemSku1 = order.items.find((item) => item.sku.id === sku1.id)!;
  const orderItemSku2 = order.items.find((item) => item.sku.id === sku2.id)!;

  TestValidator.equals(
    "order item quantity for SKU1",
    orderItemSku1.quantity,
    quantitySku1,
  );
  TestValidator.equals(
    "order item quantity for SKU2",
    orderItemSku2.quantity,
    quantitySku2,
  );

  // 9. Open cancellation request scoped to partial items
  const cancellationRequestCreateBody = {
    shopping_mall_order_id: order.id,
    request_code: `CANCEL_${RandomGenerator.alphabets(6)}`,
    status: "pending",
    scope_type: "partial_items",
    reason_code: "customer_change_of_mind",
    reason_description: "Customer wants to cancel some items",
    requested_at: new Date().toISOString(),
    requested_by_actor_type: "customer",
  } satisfies IShoppingMallCancellationRequest.ICreate;
  const cancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.customer.cancellationRequests.create(
      connection,
      {
        body: cancellationRequestCreateBody,
      },
    );
  typia.assert(cancellationRequest);

  // 10. First cancellation request item for SKU1 with full ordered quantity
  const firstCancelItemBody = {
    orderItemId: orderItemSku1.id,
    requestedQuantity: orderItemSku1.quantity,
    reasonDescription: "Cancel entire SKU1",
  } satisfies IShoppingMallCancellationRequestItem.ICreate;
  const firstCancelItem: IShoppingMallCancellationRequestItem =
    await api.functional.shoppingMall.customer.cancellationRequests.items.create(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: firstCancelItemBody,
      },
    );
  typia.assert(firstCancelItem);

  TestValidator.equals(
    "requested quantity for first cancellation item",
    firstCancelItem.requestedQuantity,
    orderItemSku1.quantity,
  );
  TestValidator.equals(
    "order item linkage for first cancellation item",
    firstCancelItem.orderItem.id,
    orderItemSku1.id,
  );

  // 11. Second cancellation item for same order item exceeding total quantity
  const exceedingRequestedQuantity = (orderItemSku1.quantity + 1) as number &
    tags.Type<"int32">;

  await TestValidator.error(
    "cannot exceed total cancellable quantity per order item",
    async () => {
      const secondCancelItemBody = {
        orderItemId: orderItemSku1.id,
        requestedQuantity: exceedingRequestedQuantity,
        reasonDescription: "Try to cancel more than ordered",
      } satisfies IShoppingMallCancellationRequestItem.ICreate;

      await api.functional.shoppingMall.customer.cancellationRequests.items.create(
        connection,
        {
          cancellationRequestId: cancellationRequest.id as string &
            tags.Format<"uuid">,
          body: secondCancelItemBody,
        },
      );
    },
  );

  // 12. Cancellation item for second order item (SKU2) within allowed quantity
  const requestedQuantitySku2 = (quantitySku2 - 2) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const secondSkuCancelItemBody = {
    orderItemId: orderItemSku2.id,
    requestedQuantity: requestedQuantitySku2,
    reasonDescription: "Partial cancel SKU2",
  } satisfies IShoppingMallCancellationRequestItem.ICreate;
  const secondSkuCancelItem: IShoppingMallCancellationRequestItem =
    await api.functional.shoppingMall.customer.cancellationRequests.items.create(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: secondSkuCancelItemBody,
      },
    );
  typia.assert(secondSkuCancelItem);

  TestValidator.equals(
    "requested quantity for SKU2 cancellation item",
    secondSkuCancelItem.requestedQuantity,
    requestedQuantitySku2,
  );
  TestValidator.equals(
    "order item linkage for SKU2 cancellation item",
    secondSkuCancelItem.orderItem.id,
    orderItemSku2.id,
  );

  // 13. Sanity checks: all created items share same cancellation request id
  TestValidator.equals(
    "cancellation request linkage for first item",
    firstCancelItem.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "cancellation request linkage for second SKU item",
    secondSkuCancelItem.cancellationRequest.id,
    cancellationRequest.id,
  );
}
