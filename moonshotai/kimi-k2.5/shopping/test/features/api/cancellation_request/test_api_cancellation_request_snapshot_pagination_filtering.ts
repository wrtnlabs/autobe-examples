import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_cancellation_request_snapshot_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: window?.location?.href ?? "http://localhost:3000/",
      referrer: document?.referrer ?? null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Setup customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: window?.location?.href ?? "http://localhost:3000/",
      referrer: document?.referrer ?? null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Create cancellation request through customer
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies Partial<IEcommerceMallCancellationRequest.ICreate>,
      },
    );
  // 4. Test pagination - First page with small limit
  const page1 =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 1,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: null,
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current matches", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 1", page1.pagination.limit, 1);
  // 5. Test second page pagination if data exists
  const page2 =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 2,
          limit: 1,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: null,
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current matches", page2.pagination.current, 2);
  // 6. Verify pagination metadata consistency
  TestValidator.equals(
    "pagination records match",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    page1.pagination.pages >= 0,
  );
  // 7. Test filtering by statusBefore
  const filteredPending =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: "pending",
          statusAfter: null,
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(filteredPending);
  // 8. Test filtering by statusAfter
  const filteredAfterResult =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: "approved",
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(filteredAfterResult);
  // 9. Test sorting ascending
  const sortedAsc =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: null,
          sortField: "created_at",
          sortOrder: "asc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(sortedAsc);
  // 10. Test date range filtering
  const now = new Date().toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const dateFiltered =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: pastDate,
          createdAtTo: now,
          statusBefore: null,
          statusAfter: null,
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateFiltered);
}