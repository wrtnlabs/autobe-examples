import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_customer_reviews_create } from "../../../generate/generate_random_e_commerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_review_snapshot_preserved_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a review via the generate function which handles all
  //    prerequisites (seller, product, variant, order, shipping, delivery)
  const review = await generate_random_e_commerce_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  // 3. Edit the review's rating to generate a second 'rating' snapshot
  const newRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const editedReview =
    await api.functional.eCommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: { rating: newRating },
      },
    );
  typia.assert(editedReview);
  // 4. Soft-delete the review (snapshots should be preserved)
  await api.functional.eCommerceMall.customer.reviews.erase(
    customerConnection,
    {
      reviewId: review.id,
    },
  );
  // 5. Retrieve the snapshot history — must succeed even after deletion
  const snapshotPage =
    await api.functional.eCommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {},
      },
    );
  typia.assert(snapshotPage);
  // 6. Validations
  // 6.1 At least one snapshot must exist (the initial 'created' one)
  TestValidator.predicate(
    "snapshots exist despite review deletion",
    snapshotPage.data.length >= 1,
  );
  // 6.2 Find the initial 'created' snapshot and verify rating matches original
  const createdSnapshot = snapshotPage.data.find(
    (s) => s.changed_fields === "created",
  );
  TestValidator.predicate(
    "initial created snapshot present",
    createdSnapshot !== undefined,
  );
  if (createdSnapshot) {
    TestValidator.equals(
      "created snapshot preserves original rating",
      createdSnapshot.rating,
      review.rating,
    );
  }
  // 6.3 Verify a 'rating' snapshot was created after the edit
  const ratingSnapshot = snapshotPage.data.find(
    (s) => s.changed_fields === "rating",
  );
  TestValidator.predicate(
    "rating edit snapshot present",
    ratingSnapshot !== undefined,
  );
  if (ratingSnapshot) {
    TestValidator.equals(
      "rating snapshot preserves previous rating value",
      ratingSnapshot.rating,
      review.rating,
    );
  }
  // 6.4 Pagination metadata
  TestValidator.predicate(
    "pagination current > 0",
    snapshotPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    snapshotPage.pagination.records >= snapshotPage.data.length,
  );
  // 6.5 Filter by changed_fields = 'created' returns only created snapshots
  const filteredPage =
    await api.functional.eCommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: { changed_fields: "created" },
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered results contain only created snapshots",
    filteredPage.data.every((s) => s.changed_fields === "created"),
  );
  TestValidator.equals(
    "filtered page has exactly 1 record",
    filteredPage.pagination.records,
    1,
  );
}
