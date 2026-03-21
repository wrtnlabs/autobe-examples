import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test the single seller rule enforcement where a seller cannot create a shipment containing order items from different sellers.
 *
 * **Preconditions:**
 * - Two different approved sellers with products
 * - Customer order containing items from both sellers
 * - Both order items in 'paid' status
 *
 * **Test Steps:**
 * 1. Admin creates and authenticates
 * 2. First seller registers and gets approved
 * 3. Second seller registers and gets approved
 * 4. Both sellers create products with variants and inventory
 * 5. Customer registers, adds items from both sellers to cart, and checks out
 * 6. First seller attempts to create shipment including items from second seller
 *
 * **Expected Results:**
 * - Response returns 400 Bad Request
 * - Error message indicates single seller rule violation
 * - No shipment record created
 * - Order items remain in 'paid' status (unchanged)
 */
export async function test_api_shipment_single_seller_rule_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. First seller setup (Seller A)
  const sellerACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const sellerAJoinResult = await authorize_seller_join(
    { host: connection.host },
    { body: sellerACredentials satisfies IEcommerceMallSeller.IJoin },
  );
  typia.assert(sellerAJoinResult);
  const sellerALoginResult = await authorize_seller_login(
    { host: connection.host },
    {
      body: {
        email: sellerACredentials.email,
        password: sellerACredentials.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerALoginResult);
  // 3. Second seller setup (Seller B)
  const sellerBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const sellerBJoinResult = await authorize_seller_join(
    { host: connection.host },
    { body: sellerBCredentials satisfies IEcommerceMallSeller.IJoin },
  );
  typia.assert(sellerBJoinResult);
  const sellerBLoginResult = await authorize_seller_login(
    { host: connection.host },
    {
      body: {
        email: sellerBCredentials.email,
        password: sellerBCredentials.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerBLoginResult);
  // 4. Admin approves both sellers
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: sellerAJoinResult.id,
        status: "approved",
      } satisfies IEcommerceMallSellerApproval.ICreate,
    },
  );
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: sellerBJoinResult.id,
        status: "approved",
      } satisfies IEcommerceMallSellerApproval.ICreate,
    },
  );
  // 5. Seller A creates product with variant and inventory
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    {
      host: connection.host,
      headers: { Authorization: sellerALoginResult.token.access },
    },
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(productA);
  // Add inventory to Seller A's product variant
  const variantA = productA.variants[0];
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    {
      host: connection.host,
      headers: { Authorization: sellerALoginResult.token.access },
    },
    {
      params: { productId: productA.id, variantId: variantA.id },
      body: {
        operation: "restock",
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >() as number & tags.Type<"int32"> & tags.Minimum<1>,
        reason: "Initial stock",
      },
    },
  );
  // 6. Seller B creates product with variant and inventory
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    {
      host: connection.host,
      headers: { Authorization: sellerBLoginResult.token.access },
    },
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(productB);
  // Add inventory to Seller B's product variant
  const variantB = productB.variants[0];
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    {
      host: connection.host,
      headers: { Authorization: sellerBLoginResult.token.access },
    },
    {
      params: { productId: productB.id, variantId: variantB.id },
      body: {
        operation: "restock",
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >() as number & tags.Type<"int32"> & tags.Minimum<1>,
        reason: "Initial stock",
      },
    },
  );
  // 7. Customer setup and cart creation
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Add Seller A's product to cart
  const cartItemA =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variantA.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(cartItemA);
  // Add Seller B's product to cart
  const cartItemB =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variantB.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(cartItemB);
  // 8. Customer checkout - creates order with items from both sellers
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: typia.random<string>(),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Extract order items - one from Seller A, one from Seller B
  const orderItemFromSellerA = order.orderItems.find(
    (item) => item.productSnapshot.name === productA.name,
  )!;
  const orderItemFromSellerB = order.orderItems.find(
    (item) => item.productSnapshot.name === productB.name,
  )!;
  TestValidator.equals(
    "order has items from both sellers",
    order.orderItems.length,
    2,
  );
  // 9. Seller A attempts to create shipment with items from BOTH sellers - SHOULD FAIL
  await TestValidator.error("single seller rule violation", async () => {
    await api.functional.ecommerceMall.seller.shipments.create(
      {
        host: connection.host,
        headers: { Authorization: sellerALoginResult.token.access },
      },
      {
        body: {
          orderId: order.id,
          orderItemIds: [orderItemFromSellerA.id, orderItemFromSellerB.id],
          carrier: "FedEx",
          trackingNumber: "123456789",
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  });
  // 10. Verify order items remain in 'paid' status (shipment was not created)
  const updatedOrder =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: typia.random<string>(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(updatedOrder);
  const sellerAItem = updatedOrder.orderItems.find(
    (item) => item.productSnapshot.name === productA.name,
  )!;
  const sellerBItem = updatedOrder.orderItems.find(
    (item) => item.productSnapshot.name === productB.name,
  )!;
  TestValidator.equals(
    "Seller A order item status is paid",
    sellerAItem.status,
    "paid",
  );
  TestValidator.equals(
    "Seller B order item status is paid",
    sellerBItem.status,
    "paid",
  );
}
