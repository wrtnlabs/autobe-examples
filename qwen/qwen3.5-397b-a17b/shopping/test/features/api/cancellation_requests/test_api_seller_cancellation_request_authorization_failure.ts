import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_member_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test seller cancellation request authorization failure for cross-seller access.
 *
 * Validates that sellers cannot access cancellation requests for order items belonging to products owned by other sellers. This test ensures proper authorization enforcement at the seller-product ownership level, protecting seller data isolation and business privacy.
 *
 * The test creates two separate seller accounts (Seller A and Seller B), where Seller B's product is purchased by a customer who then creates a cancellation request. When Seller A attempts to access Seller B's cancellation request, the system must reject the request with 403 Forbidden.
 *
 * 1. Seller A registers account and creates a product (product owner context).
 * 2. Seller B registers account and creates a product with variant.
 * 3. Customer registers account and creates an order containing Seller B's product variant.
 * 4. Customer creates a cancellation request for the order item.
 * 5. Seller A attempts to access Seller B's cancellation request.
 * 6. Validates that Seller A receives 403 Forbidden response.
 *
 * Special attention is given to verifying that the authorization check correctly identifies the seller-product ownership relationship and denies access when the requesting seller does not own the product associated with the cancellation request.
 */
export async function test_api_seller_cancellation_request_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for reuse
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Seller A setup - registers and creates a product
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  const sellerALoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerALoginConnection, {
    body: {
      email: sellerA.email,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerALoginConnection,
    {},
  );
  typia.assert(productA);
  // 2. Seller B setup - registers and creates a product with variant
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  const sellerBLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBLoginConnection, {
    body: {
      email: sellerB.email,
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBLoginConnection,
    {},
  );
  typia.assert(productB);
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBLoginConnection,
      {
        params: { productId: productB.id },
      },
    );
  typia.assert(variantB);
  // 3. Customer setup - registers and creates order
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customer);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerLoginConnection, {
    body: {
      email: customer.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  // 4. Customer creates order
  const order = await generate_random_shopping_mall_member_orders_create(
    customerLoginConnection,
    {},
  );
  typia.assert(order);
  // 5. Customer creates cancellation request for the order item
  const orderItem = order.orderItems[0];
  const cancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create(
      customerLoginConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 6. Seller A attempts to access Seller B's cancellation request - should fail with 403
  await TestValidator.httpError(
    "seller A cannot access seller B's cancellation request",
    403,
    async () => {
      await api.functional.shoppingMall.seller.cancellation_requests.at(
        sellerALoginConnection,
        {
          cancellationRequestId: cancellationRequest.id,
        },
      );
    },
  );
}
