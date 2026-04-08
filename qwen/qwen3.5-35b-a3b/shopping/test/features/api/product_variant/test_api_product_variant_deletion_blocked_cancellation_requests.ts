import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_variant_deletion_blocked_cancellation_requests(
  connection: api.IConnection,
): Promise<void> {
  // Generate shared credentials for seller and customer
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const displayNames = [RandomGenerator.name(), RandomGenerator.name()];
  // 1. Seller setup: register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      display_name: displayNames[0],
    },
  });
  typia.assert(sellerAuth);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller.example.com/products",
      referrer: "https://seller.example.com/dashboard",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Customer setup: register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: displayNames[1],
    },
  });
  typia.assert(customerAuth);
  await authorize_member_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://member.example.com/orders",
      referrer: "https://member.example.com/home",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallMember.ILogin,
  });
  // 3. Seller creates a product (uses random category_id)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant for the product
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: `{"color": "red", "size": "L"}`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer creates an order with this variant
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id: variant.id,
            quantity: 2,
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 6. Customer submits a cancellation request for the order item
  const cancellationRequest =
    await generate_random_ecommerce_mall_member_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: order.items[0].id,
          reason: "Changed my mind, no longer need this item",
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 7. Verify cancellation request is pending
  TestValidator.equals(
    "cancellation request status",
    cancellationRequest.status,
    "pending",
  );
  // 8. Seller attempts to delete the variant
  const deletePromise =
    api.functional.ecommerceMall.seller.products.variants.erase(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  // 9. Validate deletion is blocked with 409 Conflict
  await TestValidator.httpError(
    "variant deletion should fail with 409 Conflict due to pending cancellation request",
    409,
    async () => {
      await deletePromise;
    },
  );
  // 10. Validate cancellation request remains pending
  TestValidator.equals(
    "cancellation request should remain pending after failed deletion attempt",
    cancellationRequest.status,
    "pending",
  );
  // 11. Verify the cancellation request references the correct order item and order
  TestValidator.equals(
    "cancellation request order item matches",
    cancellationRequest.item.id,
    order.items[0].id,
  );
  TestValidator.equals(
    "cancellation request order matches",
    cancellationRequest.order.id,
    order.id,
  );
}
