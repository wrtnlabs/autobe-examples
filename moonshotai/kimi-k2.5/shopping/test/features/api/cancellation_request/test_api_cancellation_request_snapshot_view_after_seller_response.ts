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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
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
 * Test the primary success path where a seller views cancellation request snapshots after responding to a customer request.
 *
 * 1. Authenticate as admin and create a category
 * 2. Authenticate as seller and create a product
 * 3. Create a product variant under that product
 * 4. Authenticate as customer, add the variant to cart, and complete checkout to create an order
 * 5. Submit a cancellation request for the paid order item
 * 6. As seller, respond to the cancellation request (approve or reject) which triggers automatic snapshot creation
 * 7. Query the snapshots endpoint and verify:
 *    - Paginated list response with proper structure
 *    - Snapshots are stored and retrievable
 *    - Each snapshot captures the state transition including status_before and status_after
 */
export async function test_api_cancellation_request_snapshot_view_after_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Step 2: Seller setup - create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8> & tags.Format<"password">>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: typia.random<string & tags.MinLength<1>>(),
        description: typia.random<string & tags.MinLength<1>>(),
        categoryId: category.id,
        basePrice: typia.random<number>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: typia.random<string & tags.MinLength<1>>(),
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price: typia.random<number & tags.Minimum<0>>(),
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // Step 4: Customer setup and checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Add variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Create order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "Test Recipient",
        recipientPhone: "01012345678",
        streetAddress: "123 Test Street",
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "South Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  typia.assert(order.orderItems.length === 1);
  const orderItem = order.orderItems[0];
  TestValidator.equals(
    "order item status before cancellation",
    orderItem.status,
    "paid",
  );
  // Step 5: Submit cancellation request by customer
  const cancellationReason = "Changed my mind about the purchase";
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellationRequests.create(
      customerConnection,
      {
        body: {
          orderItemId: (orderItem as IEntity & IEcommerceMallOrderItem).id,
          reason: cancellationReason,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  // Step 6: Seller responds to cancellation request (approve) - triggers snapshot creation
  const sellerResponseReason = "Approved as per customer request";
  const respondedRequest =
    await api.functional.ecommerceMall.seller.cancellationRequests.actions.respond(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          action: "approve",
          reason: sellerResponseReason,
        } satisfies IEcommerceMallCancellationRequest.IRespond,
      },
    );
  typia.assert(respondedRequest);
  TestValidator.equals(
    "status after approval",
    respondedRequest.status,
    "approved",
  );
  // Step 7: Query snapshots endpoint
  const snapshotRequest = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const snapshotsResponse: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.cancellationRequests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: snapshotRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Validate pagination structure
  typia.assert(snapshotsResponse.pagination);
  TestValidator.equals(
    "pagination has current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    snapshotsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    snapshotsResponse.pagination.pages >= 0,
  );
  // Validate snapshots data
  typia.assert(snapshotsResponse.data);
  TestValidator.predicate(
    "at least one snapshot exists after response",
    snapshotsResponse.data.length > 0,
  );
  // Validate snapshot content
  const snapshot = snapshotsResponse.data[0];
  typia.assert(snapshot);
  // Verify snapshot captures state transition
  TestValidator.equals(
    "snapshot status_before is pending",
    snapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "snapshot status_after is approved",
    snapshot.statusAfter,
    "approved",
  );
  // Verify reason preservation (reasonBefore should be customer's original reason)
  if (snapshot.reasonBefore !== null) {
    TestValidator.equals(
      "snapshot preserves original reason",
      snapshot.reasonBefore,
      cancellationReason,
    );
  }
  // Verify reviewer note is preserved
  TestValidator.equals(
    "snapshot includes reviewer note",
    snapshot.reviewerNote,
    sellerResponseReason,
  );
  // Verify createdAt timestamp exists
  typia.assert(snapshot.createdAt);
  TestValidator.predicate(
    "createdAt is valid timestamp",
    !isNaN(new Date(snapshot.createdAt).getTime()),
  );
  // Verify snapshot structure matches ISummary
  typia.assert<IPageIEcommerceMallCancellationRequestSnapshot.ISummary>(
    snapshotsResponse,
  );
}