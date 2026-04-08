import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_order_item_retrieval_own_order(connection: api.IConnection): Promise<void> {
    // 1. Register and login as customer
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {});
    typia.assert(customerAuth);

    // 2. Create shipping address for checkout
    const streetNum = typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<999>>();
    const postalNum = typia.random<number & tags.Type<"int32"> & tags.Minimum<10000> & tags.Maximum<99999>>();
    const address = await generate_random_ecommerce_mall_customer_customers_addresses_create(customerConnection, {
        body: {
            recipientName: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            streetAddress: `${streetNum} ${RandomGenerator.alphabets(8)} Street`,
            city: RandomGenerator.paragraph({ sentences: 1 }),
            state: RandomGenerator.paragraph({ sentences: 1 }),
            postalCode: String(postalNum),
            country: "Test Country",
            isDefault: true,
        },
    });
    typia.assert(address);

    // 3. Register as seller
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {});
    typia.assert(sellerAuth);

    // 4. Create admin and approve seller
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(adminConnection, {
        body: {
            email: "admin@test.com",
            password: "1234",
            href: "http://localhost:3000",
            referrer: "http://localhost:3000",
        },
    });

    // 5. Create product with variants
    const product = await generate_random_ecommerce_mall_seller_products_create(sellerConnection, {});
    typia.assert(product);

    // 6. Add product to cart
    const cartQuantity = typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>>();
    const cartItem = await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(customerConnection, {
        body: {
            variantId: product.variants[0].id,
            quantity: cartQuantity,
        },
    });
    typia.assert(cartItem);

    // 7. Complete checkout
    const order = await generate_random_ecommerce_mall_customer_payments_checkout(customerConnection, {
        body: {
            shippingAddressId: address.id,
        },
    });
    typia.assert(order);

    // 8. Get order item ID from the order
    const orderItem = order.orderItems[0];
    typia.assert(orderItem);

    // 9. Retrieve order item details
    const retrievedOrderItem = await api.functional.ecommerceMall.customer.ecommerceMall.orders.items.at(customerConnection, {
        orderId: order.id,
        itemId: orderItem.id,
    });
    typia.assert(retrievedOrderItem);

    // Validations
    TestValidator.equals("order item id matches", retrievedOrderItem.id, orderItem.id);
    TestValidator.equals("quantity matches", retrievedOrderItem.quantity, orderItem.quantity);
    TestValidator.equals("unit price matches", retrievedOrderItem.unitPrice, orderItem.unitPrice);
    TestValidator.equals("status is paid", retrievedOrderItem.status, "paid");
    TestValidator.predicate("has valid createdAt", !!retrievedOrderItem.createdAt);
    TestValidator.predicate("has valid updatedAt", !!retrievedOrderItem.updatedAt);

    // Validate nested order summary
    TestValidator.equals("order number matches", retrievedOrderItem.order.order_number, order.orderNumber);
    TestValidator.equals("order status matches", retrievedOrderItem.order.status, order.status);
    TestValidator.equals("order total matches", retrievedOrderItem.order.total_amount, order.totalAmount);

    // Validate nested productSnapshot
    TestValidator.predicate("has product snapshot", !!retrievedOrderItem.productSnapshot);
    TestValidator.predicate("has product name in snapshot", !!retrievedOrderItem.productSnapshot.name);
    TestValidator.predicate("has category name in snapshot", !!retrievedOrderItem.productSnapshot.categoryName);

    // Validate nested sellerProfileSnapshot
    TestValidator.predicate("has seller profile snapshot", !!retrievedOrderItem.sellerProfileSnapshot);
    TestValidator.predicate("has shop name in snapshot", !!retrievedOrderItem.sellerProfileSnapshot.shopName);

    // Validate nested productVariant
    TestValidator.predicate("has product variant", !!retrievedOrderItem.productVariant);
    TestValidator.predicate("has SKU code in variant", !!retrievedOrderItem.productVariant.sku_code);
    TestValidator.predicate("has option values in variant", retrievedOrderItem.productVariant.optionValues.length > 0);
}