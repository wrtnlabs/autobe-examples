import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test that an approved seller can successfully retrieve details of their own order item.
 *
 * This test validates the complete order item retrieval flow for an approved seller.
 * It ensures sellers can access detailed information about order items containing their products,
 * including frozen product snapshots, seller profile snapshots, variant details, and computed counts.
 *
 * Setup Flow:
 * 1. Administrator registers and authenticates to approve seller registration
 * 2. Seller registers with pending approval status
 * 3. Administrator approves seller to enable product listing
 * 4. Administrator creates a product category
 * 5. Approved seller creates a product with variants and inventory
 * 6. Customer registers and authenticates
 * 7. Customer adds product variant to shopping cart
 * 8. Customer completes checkout to create an order
 *
 * Test Flow:
 * - Seller authenticates with their credentials
 * - Seller retrieves order item by ID via GET /seller/sellers/me/orders/items/{itemId}
 * - Validates response returns HTTP 200
 * - Validates order item ID matches requested itemId
 * - Validates status is 'paid' (payment completed, awaiting shipment)
 * - Validates product snapshot contains name, description, base_price, category_name
 * - Validates seller profile snapshot contains shop_name, shop_description, logo_url
 * - Validates product variant contains sku_code and option values
 * - Validates quantity and unit_price frozen at purchase time
 * - Validates parent order reference contains order_number and created_at
 * - Validates counts: shipments_count, cancellationRequests_count, refundRequests_count, reviews_count
 */
export async function test_api_seller_order_item_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});

  // 2. Seller setup - Register seller with pending status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });

  // 3. Admin approves seller (status: approved)
  await api.functional.ecommerceMall.admin.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });

  // 4. Create product category via admin
  const category = await generate_random_ecommerce_mall_admin_admin_categories_create(adminConnection, {});
  typia.assert(category);

  // 5. Seller creates product with variants and inventory
  const product = await generate_random_ecommerce_mall_seller_sellers_me_products_create(sellerConnection, {
    body: {
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
      categoryId: category.id,
    },
  });
  typia.assert(product);

  // Get the first variant for cart addition
  const variant = product.variants[0];
  TestValidator.equals("variant exists", variant !== undefined, true);

  // 6. Customer setup - Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);

  // 7. Customer adds product variant to cart
  const cartItem = await generate_random_ecommerce_mall_customer_customers_me_cart_create(customerConnection, {
    body: {
      variantId: variant!.id,
      quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>>(),
    },
  });
  typia.assert(cartItem);

  // 8. Customer completes checkout to create order
  // First get customer's shipping address to use in order
  const shippingAddress = customer.shippingAddresses[0];
  TestValidator.equals("shipping address exists", shippingAddress !== undefined, true);

  const order = await generate_random_ecommerce_mall_customer_customers_me_orders_create(customerConnection, {
    body: {
      shippingAddressId: shippingAddress!.id,
    },
  });
  typia.assert(order);

  // Get the order item ID from the created order
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item exists", orderItem !== undefined, true);

  // 9. Test: Seller retrieves order item details
  // Authenticate as seller again to ensure valid session
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: seller.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });

  // Retrieve order item by ID
  const retrievedOrderItem = await api.functional.ecommerceMall.seller.sellers.me.orders.items.at(
    sellerLoginConnection,
    {
      itemId: orderItem!.id,
    },
  );
  typia.assert(retrievedOrderItem);

  // Validate response includes:
  // - Order item ID matches requested itemId
  // - Status is 'paid' (payment completed, awaiting shipment)
  // - Product snapshot with name, description, base_price, category_name
  // - Seller profile snapshot with shop_name, shop_description, logo_url
  // - Product variant with sku_code and option values
  // - Quantity and unit_price frozen at purchase time
  // - Parent order reference with order_number and created_at
  // - Counts: shipments_count, cancellationRequests_count, refundRequests_count, reviews_count
  TestValidator.equals("order item ID matches", retrievedOrderItem.id, orderItem!.id);
  TestValidator.equals("status is paid", retrievedOrderItem.status, "paid");
  TestValidator.equals("product snapshot name exists", !!retrievedOrderItem.productSnapshot.name, true);
  TestValidator.equals("product snapshot description exists", !!retrievedOrderItem.productSnapshot.description, true);
  TestValidator.equals("product snapshot basePrice exists", !!retrievedOrderItem.productSnapshot.basePrice, true);
  TestValidator.equals("product snapshot categoryName exists", !!retrievedOrderItem.productSnapshot.categoryName, true);
  TestValidator.equals("seller profile snapshot shopName exists", !!retrievedOrderItem.sellerProfileSnapshot.shopName, true);
  TestValidator.equals("seller profile snapshot shopDescription exists", retrievedOrderItem.sellerProfileSnapshot.shopDescription !== undefined, true);
  TestValidator.equals("seller profile snapshot logoUrl exists", retrievedOrderItem.sellerProfileSnapshot.logoUrl !== undefined, true);
  TestValidator.equals("product variant skuCode exists", !!retrievedOrderItem.productVariant.skuCode, true);
  TestValidator.equals("quantity is positive", retrievedOrderItem.quantity > 0, true);
  TestValidator.equals("unit price is positive", retrievedOrderItem.unitPrice > 0, true);
  TestValidator.equals("order order_number exists", !!retrievedOrderItem.order.order_number, true);
  TestValidator.equals("order created_at exists", !!retrievedOrderItem.order.created_at, true);
  TestValidator.equals("shipments count is zero or more", retrievedOrderItem.shipments_count >= 0, true);
  TestValidator.equals("cancellation requests count is zero or more", retrievedOrderItem.cancellationRequests_count >= 0, true);
  TestValidator.equals("refund requests count is zero or more", retrievedOrderItem.refundRequests_count >= 0, true);
  TestValidator.equals("reviews count is zero or more", retrievedOrderItem.reviews_count >= 0, true);
}