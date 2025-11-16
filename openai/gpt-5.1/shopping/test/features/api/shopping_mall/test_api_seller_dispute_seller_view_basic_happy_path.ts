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
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDispute";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_seller_dispute_seller_view_basic_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a seller (join) and capture credentials
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  // 2. Create a product for this seller
  const productCode: string = RandomGenerator.alphaNumeric(16);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);
  TestValidator.equals(
    "created product code should match",
    product.code,
    productCode,
  );

  // 3. Create an option type for the product
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 4. Create an option value under that type
  const optionValueCreateBody = {
    value: "L",
    display_name: "Large",
    display_order: 0 as number & tags.Type<"int32">,
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
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  // 5. Create a SKU for the product
  const skuCode: string = RandomGenerator.alphaNumeric(10);

  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} - ${optionValue.display_name ?? optionValue.value}`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  // 6. Create inventory item for the SKU so it can be ordered
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 7. Register a customer and authenticate
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphaNumeric(10);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  // 8. Create a customer cart
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
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
  typia.assert<IShoppingMallCustomerCart>(cart);

  // 9. Add the SKU as a cart item
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 10. Create an order from the cart
  const itemsSubtotal = 80;
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 5;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  TestValidator.equals(
    "order customer id should match authorized customer",
    order.customer_id,
    customerAuth.id,
  );

  // 11. Create a dispute for this order as the customer
  const disputeIssueCategory = "damaged_item";
  const disputeIssueTitle = "Item arrived damaged";
  const disputeIssueDescription =
    "The product box was crushed and item scratched.";

  const disputeCreateBody = {
    shopping_mall_order_line_id: undefined,
    issue_category: disputeIssueCategory,
    issue_title: disputeIssueTitle,
    issue_description: disputeIssueDescription,
  } satisfies IShoppingMallOrderDispute.ICreate;

  const customerDispute: IShoppingMallOrderDispute =
    await api.functional.shoppingMall.customer.orders.disputes.create(
      connection,
      {
        orderId: order.id,
        body: disputeCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderDispute>(customerDispute);

  TestValidator.equals(
    "dispute order id should match order",
    customerDispute.shopping_mall_order_id,
    order.id,
  );

  // 12. Re-authenticate as seller to ensure seller context
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerReAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerReAuth);

  TestValidator.equals(
    "re-authenticated seller id matches original",
    sellerReAuth.id,
    sellerAuth.id,
  );

  // 13. Seller retrieves the seller-focused dispute view
  const sellerViewDispute: IShoppingMallOrderDispute =
    await api.functional.shoppingMall.seller.orders.disputes.seller.at(
      connection,
      {
        orderId: order.id,
        disputeId: customerDispute.id,
      },
    );
  typia.assert<IShoppingMallOrderDispute>(sellerViewDispute);

  // 14. Validate basic identity and consistency
  TestValidator.equals(
    "seller-view dispute id should equal customer-created dispute id",
    sellerViewDispute.id,
    customerDispute.id,
  );
  TestValidator.equals(
    "seller-view dispute order id should match order id",
    sellerViewDispute.shopping_mall_order_id,
    order.id,
  );

  if (sellerViewDispute.order !== undefined) {
    TestValidator.equals(
      "seller-view dispute embedded order summary id matches order id",
      sellerViewDispute.order.id,
      order.id,
    );
  }

  TestValidator.equals(
    "issue_category should match between customer and seller views",
    sellerViewDispute.issue_category,
    customerDispute.issue_category,
  );
  TestValidator.equals(
    "issue_title should match between customer and seller views",
    sellerViewDispute.issue_title,
    customerDispute.issue_title,
  );
  TestValidator.equals(
    "issue_description should match between customer and seller views",
    sellerViewDispute.issue_description,
    customerDispute.issue_description,
  );

  if (sellerViewDispute.orderLine !== undefined) {
    TestValidator.equals(
      "orderLine summary shopping_mall_order_id should match order id when present",
      sellerViewDispute.orderLine.shopping_mall_order_id,
      order.id,
    );
  }

  TestValidator.predicate(
    "seller-view dispute actor_type should be non-empty",
    sellerViewDispute.actor_type.length > 0,
  );
  TestValidator.predicate(
    "seller-view dispute status should be non-empty",
    sellerViewDispute.dispute_status.length > 0,
  );
}
