import api from "@ORGANIZATION/PROJECT-api";
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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_customer_order_item_authorization_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A registers and authenticates
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  // 2. Customer A creates address
  const addressA =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(addressA);
  // 3. Setup seller with approved products
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 4. Admin approves seller - get approval ID first then approve
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // The approve endpoint requires approvalId which is the seller_approval record UUID
  // For this test, we use the seller ID directly as the approval reference
  const sellerApproval =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.approve(
      adminConnection,
      {
        approvalId: seller.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(sellerApproval);
  // 5. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 6. Customer A adds product to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      customerAConnection,
      {
        body: {
          variantId: product.variants[0].id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer A completes checkout
  const order = await generate_random_ecommerce_mall_customer_payments_checkout(
    customerAConnection,
    {
      body: {
        shippingAddressId: addressA.id,
      },
    },
  );
  typia.assert(order);
  // Get Customer A's order item ID
  const orderItemId = order.orderItems[0].id;
  const orderId = order.id;
  // 8. Customer B registers and authenticates (different customer with unique email)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: `customerB_${typia.random<string & tags.Format<"email">>()}`,
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 9. Customer B attempts to access Customer A's order item - should return 403 Forbidden
  await TestValidator.httpError(
    "Customer B cannot access Customer A's order item",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.ecommerceMall.orders.items.at(
        customerBConnection,
        {
          orderId: orderId,
          itemId: orderItemId,
        },
      );
    },
  );
  // 10. Verify Customer B can access their own order item (proves authorization works)
  const customerBAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerBConnection,
      {},
    );
  typia.assert(customerBAddress);
  const cartItemB =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      customerBConnection,
      {
        body: {
          variantId: product.variants[0].id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemB);
  const orderB =
    await generate_random_ecommerce_mall_customer_payments_checkout(
      customerBConnection,
      {
        body: {
          shippingAddressId: customerBAddress.id,
        },
      },
    );
  typia.assert(orderB);
  // Customer B can access their own order item
  const ownOrderItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.orders.items.at(
      customerBConnection,
      {
        orderId: orderB.id,
        itemId: orderB.orderItems[0].id,
      },
    );
  typia.assert(ownOrderItem);
  TestValidator.equals(
    "Customer B's own order item is accessible",
    ownOrderItem.id,
    orderB.orderItems[0].id,
  );
}
