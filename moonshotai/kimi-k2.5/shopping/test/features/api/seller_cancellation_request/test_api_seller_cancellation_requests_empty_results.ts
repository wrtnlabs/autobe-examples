import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
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
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test handling of empty results when no cancellation requests match the filter criteria.
 *
 * This test ensures the seller cancellation requests endpoint gracefully handles empty result sets:
 * 1) Sets up seller, admin, and customer actors
 * 2) Creates category, product, and variant as seller
 * 3) Customer places an order (creating order items)
 * 4) Does NOT create any cancellation requests
 * 5) Queries cancellation requests with various status filters (pending, approved, rejected)
 * 6) Verifies empty data array and correct pagination metadata (0 records, 0 pages, current page 1)
 *
 * @param connection - Base connection for API communication
 */
export async function test_api_seller_cancellation_requests_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connections for each actor
  const sellerConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as seller
  await authorize_seller_join(sellerConnection, {});
  // 2. Authenticate as admin and create category
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 3. Seller creates product and variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<100>>(),
        description: typia.random<string & tags.MinLength<1> & tags.MaxLength<1000>>(),
        basePrice: typia.random<number & tags.Type<"double"> & tags.Minimum<0>>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {},
      },
    );
  // 4. Authenticate as customer
  await authorize_customer_join(customerConnection, {});
  // 5. Customer adds variant to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 6. Customer completes checkout (creates order with order items, but no cancellation requests)
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 7. Query cancellation requests as seller with 'pending' status filter
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const pendingResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: limit,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // 8. Verify the response returns an empty data array
  TestValidator.equals(
    "empty data array with pending filter",
    pendingResponse.data.length,
    0,
  );
  // 9. Verify pagination shows correct empty state
  TestValidator.equals(
    "pagination current page",
    pendingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    pendingResponse.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination records",
    pendingResponse.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", pendingResponse.pagination.pages, 0);
  // 10. Test with 'approved' filter to confirm no results
  const approvedResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResponse);
  TestValidator.equals(
    "empty data array with approved filter",
    approvedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "approved pagination records",
    approvedResponse.pagination.records,
    0,
  );
  // 11. Test with 'rejected' filter to confirm no results
  const rejectedResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  TestValidator.equals(
    "empty data array with rejected filter",
    rejectedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "rejected pagination records",
    rejectedResponse.pagination.records,
    0,
  );
  // 12. Test without status filter to verify no results when no cancellation requests exist
  const allResponse =
    await api.functional.ecommerceMall.seller.cancellationRequests.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allResponse);
  TestValidator.equals(
    "empty data array without status filter",
    allResponse.data.length,
    0,
  );
  TestValidator.equals(
    "all pagination records",
    allResponse.pagination.records,
    0,
  );
}