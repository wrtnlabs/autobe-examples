import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test successful retrieval of cancellation request details by seller.
 *
 * This scenario validates that a seller can successfully retrieve the details of a cancellation request
 * that belongs to their product. The seller should see complete information including the cancellation
 * reason, current status, requesting customer details, associated order item with product snapshots,
 * and the full snapshot history.
 */
export async function test_api_cancellation_request_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin joins and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies DeepPartial<IEcommerceMallAdmin.IJoin>,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies DeepPartial<IEcommerceMallCategory.ICreate>,
    },
  );
  // Step 2: Seller joins and creates a product with a variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies DeepPartial<IEcommerceMallSeller.IJoin>,
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies DeepPartial<IEcommerceMallProduct.ICreate>,
    },
  );
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
            () =>
              ({
                optionName: RandomGenerator.alphabets(5),
                optionValue: RandomGenerator.alphabets(5),
              }) satisfies IEcommerceMallProductVariantOption.ICreate,
          ),
          stock: 100,
        } satisfies DeepPartial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  // Step 3: Customer joins, adds variant to cart, and completes checkout to create order
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies DeepPartial<IEcommerceMallCustomer.IJoin>,
  });
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      } satisfies DeepPartial<IEcommerceMallCartItem.ICreate>,
    },
  );
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.alphabets(2).toUpperCase(),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.alphabets(2).toUpperCase(),
      } satisfies DeepPartial<IEcommerceMallOrder.ICreate>,
    },
  );
  // Step 4: Customer creates a cancellation request for the first order item
  const orderItem = typia.assert<IEcommerceMallOrderItem & IEntity>(order.orderItems[0]);
  const orderItemId = orderItem.id;
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies DeepPartial<IEcommerceMallCancellationRequest.ICreate>,
      },
    );
  // Step 5: Seller retrieves the cancellation request details
  const retrievedRequest =
    await api.functional.ecommerceMall.seller.cancellationRequests.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  // Validate the retrieved response
  typia.assert(retrievedRequest);
  // Validate all required fields are present
  TestValidator.equals(
    "cancellation request id matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "reason matches input",
    retrievedRequest.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "status should be pending",
    retrievedRequest.status,
    "pending",
  );
  TestValidator.equals(
    "responseReason should be null",
    retrievedRequest.responseReason,
    null,
  );
  TestValidator.equals(
    "respondedAt should be null",
    retrievedRequest.respondedAt,
    null,
  );
  // Validate nested orderItem contains product and variant snapshots
  TestValidator.equals(
    "order item id matches",
    retrievedRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.predicate(
    "order item has product snapshot",
    retrievedRequest.orderItem.product !== null,
  );
  TestValidator.predicate(
    "order item has variant snapshot",
    retrievedRequest.orderItem.variant !== null,
  );
  TestValidator.equals(
    "order item seller id matches",
    retrievedRequest.orderItem.seller.id,
    seller.id,
  );
  // Validate customer information is included
  TestValidator.equals(
    "customer id matches",
    retrievedRequest.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    customer.email,
  );
  // Validate snapshots array exists (empty since no seller response yet)
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(retrievedRequest.snapshots),
  );
  TestValidator.equals(
    "snapshots should be empty for pending request",
    retrievedRequest.snapshots.length,
    0,
  );
  // Validate timestamps
  TestValidator.predicate("createdAt is valid", !!retrievedRequest.createdAt);
  TestValidator.predicate("updatedAt is valid", !!retrievedRequest.updatedAt);
  TestValidator.equals(
    "deletedAt should be null",
    retrievedRequest.deletedAt,
    null,
  );
}