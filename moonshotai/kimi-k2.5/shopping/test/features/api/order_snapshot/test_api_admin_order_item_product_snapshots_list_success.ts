import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemProductSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_admin_order_item_product_snapshots_list_success(
  connection: api.IConnection,
): Promise<void> {} // 1. Create admin connection and join const adminConnection: api.IConnection = { host: connection.host }; const admin = await authorize_admin_join(adminConnection, {}); typia.assert(admin); // 2. Create seller connection and join const sellerConnection: api.IConnection = { host: connection.host }; const seller = await authorize_seller_join(sellerConnection, {}); typia.assert(seller); // 3. Seller submits registration const registration = await generate_random_ecommerce_mall_seller_registrations_create(sellerConnection, {}); typia.assert(registration); // 4. Admin approves seller registration const approved = await api.functional.ecommerceMall.admin.seller_registrations.update(adminConnection, { registrationId: (registration as any).id, body: { status: "approved", rejection_reason: null } satisfies IEcommerceMallSellerRegistration.IUpdate, }); typia.assert(approved); // 5. Seller creates product const product = await generate_random_ecommerce_mall_seller_products_create(sellerConnection, {}); typia.assert(product); // 6. Seller creates variant for the product const variant = await generate_random_ecommerce_mall_seller_products_variants_create(sellerConnection, { params: { productId: product.id }, }); typia.assert(variant); // 7. Create customer connection and join const customerConnection: api.IConnection = { host: connection.host }; const customer = await authorize_customer_join(customerConnection, {}); typia.assert(customer); // 8. Customer adds variant to cart const cartItem = await generate_random_ecommerce_mall_customer_cart_create(customerConnection, { body: { productVariantId: variant.id, quantity: 1, } satisfies IEcommerceMallCartItem.ICreate, }); typia.assert(cartItem); // 9. Customer creates order via checkout const order = await generate_random_ecommerce_mall_customer_checkout_create(customerConnection, { body: { recipientName: RandomGenerator.name(), recipientPhone: RandomGenerator.mobile(), streetAddress: RandomGenerator.paragraph({ sentences: 2 }), city: RandomGenerator.name(), state: RandomGenerator.name(), postalCode: RandomGenerator.alphaNumeric(5), country: RandomGenerator.name(), } satisfies IEcommerceMallOrder.ICreate, }); typia.assert(order); // Verify order has order items if (!order.orderItems || order.orderItems.length === 0) { throw new Error("Order does not have any order items"); } const orderItem = order.orderItems[0]; if (!orderItem.id) { throw new Error("Order item does not have an ID"); } // 10. Admin retrieves product snapshots for the order item const snapshots = await api.functional.ecommerceMall.admin.orders.items.product.snapshots.index(adminConnection, { orderId: order.id, itemId: orderItem.id, body: { search: null, page: 1, limit: 10, createdAtFrom: null, createdAtTo: null, } satisfies IEcommerceMallOrderItemProductSnapshot.IRequest, }); typia.assert(snapshots); // 11. Verify snapshot response structure TestValidator.predicate("snapshots.data exists", () => Array.isArray(snapshots.data)); TestValidator.predicate("snapshots.data has at least one snapshot", () => snapshots.data.length > 0); const snapshot = snapshots.data[0]; typia.assert(snapshot); // Verify required fields in snapshot TestValidator.predicate("snapshot.id exists", () => snapshot.id !== undefined); TestValidator.predicate("snapshot.name exists", () => snapshot.name !== undefined); TestValidator.predicate("snapshot.categoryName exists", () => snapshot.categoryName !== undefined); TestValidator.predicate("snapshot.basePrice exists", () => snapshot.basePrice !== undefined); TestValidator.predicate("snapshot.createdAt exists", () => snapshot.createdAt !== undefined); TestValidator.predicate("snapshot.category exists", () => snapshot.category !== undefined); // Verify snapshot captures product state at purchase time TestValidator.equals("product name matches", snapshot.name, product.name); TestValidator.predicate("basePrice is a number", () => typeof snapshot.basePrice === "number" && snapshot.basePrice >= 0); TestValidator.predicate("createdAt is valid ISO datetime", () => { const date = new Date(snapshot.createdAt); return !isNaN(date.getTime()); }); }
