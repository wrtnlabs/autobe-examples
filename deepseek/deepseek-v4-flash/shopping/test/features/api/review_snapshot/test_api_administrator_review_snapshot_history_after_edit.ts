import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReviewSnapshot";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_customer_reviews_create } from "../../../generate/generate_random_e_commerce_mall_customer_reviews_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_administrator_review_snapshot_history_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // ---- Seller setup ----
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // ---- Customer setup ----
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // Get the first order item from the order
  const orderItem = order.orderItems[0]!;
  typia.assert(orderItem);
  // ---- Write review ----
  const initialRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const initialContent = RandomGenerator.paragraph({ sentences: 3 });
  const review = await generate_random_e_commerce_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        order_item_id: orderItem.id,
        rating: initialRating,
        content: initialContent,
      },
    },
  );
  typia.assert(review);
  // ---- First edit: change only rating ----
  const newRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const finalRating =
    newRating !== initialRating ? newRating : (initialRating % 5) + 1;
  const updatedReview1 =
    await api.functional.eCommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: finalRating,
        } satisfies IECommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview1);
  // ---- Second edit: change only text ----
  const newContent = RandomGenerator.paragraph({ sentences: 5 });
  const updatedReview2 =
    await api.functional.eCommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          content: newContent,
        } satisfies IECommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview2);
  // ---- Administrator setup ----
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // ---- Retrieve snapshot history ----
  const snapshotPage =
    await api.functional.eCommerceMall.administrator.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IECommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // ---- Validation ----
  // 1. Exactly 3 snapshots
  TestValidator.equals("snapshot count", snapshotPage.data.length, 3);
  // 2. Ordered by created_at DESC (newest first: 'text' -> 'rating' -> 'created')
  const snapshots = snapshotPage.data;
  for (let i = 1; i < snapshots.length; i++) {
    TestValidator.predicate(
      "snapshot[" + (i - 1) + "] created_at >= snapshot[" + i + "] created_at",
      () =>
        new Date(snapshots[i - 1]!.created_at).getTime() >=
        new Date(snapshots[i]!.created_at).getTime(),
    );
  }
  // 3. The 'created' snapshot (oldest, index 2) has changed_fields='created'
  const createdSnapshot = snapshots[2]!;
  TestValidator.equals(
    "created snapshot changed_fields",
    createdSnapshot.changed_fields,
    "created",
  );
  TestValidator.equals(
    "created snapshot rating",
    createdSnapshot.rating,
    initialRating,
  );
  TestValidator.equals(
    "created snapshot text",
    createdSnapshot.text,
    initialContent,
  );
  // 4. The 'rating' snapshot (middle, index 1) has changed_fields='rating'
  const ratingSnapshot = snapshots[1]!;
  TestValidator.equals(
    "rating snapshot changed_fields",
    ratingSnapshot.changed_fields,
    "rating",
  );
  TestValidator.equals(
    "rating snapshot rating",
    ratingSnapshot.rating,
    initialRating,
  );
  // 5. The 'text' snapshot (newest, index 0) has changed_fields='text'
  const textSnapshot = snapshots[0]!;
  TestValidator.equals(
    "text snapshot changed_fields",
    textSnapshot.changed_fields,
    "text",
  );
  TestValidator.equals("text snapshot text", textSnapshot.text, initialContent);
  // 6. Pagination metadata validation
  const pagination = snapshotPage.pagination;
  TestValidator.predicate(
    "pagination current >= 1",
    () => pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit >= 1", () => pagination.limit >= 1);
  TestValidator.equals("pagination records", pagination.records, 3);
  TestValidator.equals("pagination pages", pagination.pages, 1);
}
