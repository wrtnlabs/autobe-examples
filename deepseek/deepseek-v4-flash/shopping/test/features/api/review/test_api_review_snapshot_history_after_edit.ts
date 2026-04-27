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

export async function test_api_review_snapshot_history_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a shipping address
  await generate_random_e_commerce_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  // 3. Add product variants to cart
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {},
  );
  // 4. Place an order (creates order items with status 'paid')
  await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {},
  );
  // 5. Create a review (generator handles all prerequisites including delivery)
  const review = await generate_random_e_commerce_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  // 6. Edit the review — change rating to trigger a snapshot
  const updatedReview =
    await api.functional.eCommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: 3,
        } satisfies IECommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 7. Retrieve review snapshots
  const snapshotsPage: IPageIECommerceMallReviewSnapshot.ISummary =
    await api.functional.eCommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {} satisfies IECommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // 8. Validate snapshots
  // 8.1. At least 2 snapshots: initial 'created' and the one from the edit
  TestValidator.predicate(
    "at least 2 snapshots exist",
    () => snapshotsPage.data.length >= 2,
  );
  // 8.2. Snapshots are ordered by created_at DESC (newest first)
  TestValidator.predicate("snapshots ordered newest first", () => {
    for (let i = 1; i < snapshotsPage.data.length; i++) {
      if (
        snapshotsPage.data[i - 1].created_at < snapshotsPage.data[i].created_at
      ) {
        return false;
      }
    }
    return true;
  });
  // 8.3. Validate each snapshot has the required shape
  for (const snapshot of snapshotsPage.data) {
    typia.assert(snapshot);
  }
  // 8.4. Find the 'created' initial snapshot
  const createdSnapshots = snapshotsPage.data.filter(
    (s) => s.changed_fields === "created",
  );
  TestValidator.predicate(
    "has initial 'created' snapshot",
    () => createdSnapshots.length >= 1,
  );
  // 8.5. Find the edit snapshot (rating change)
  const editSnapshots = snapshotsPage.data.filter(
    (s) => s.changed_fields === "rating",
  );
  TestValidator.predicate(
    "has edit snapshot with changed_fields='rating'",
    () => editSnapshots.length >= 1,
  );
  // 8.6. The edit snapshot's rating should be the previous value (before edit, which was the initial rating)
  if (editSnapshots.length > 0) {
    TestValidator.predicate(
      "edit snapshot rating is valid",
      () => editSnapshots[0].rating >= 1 && editSnapshots[0].rating <= 5,
    );
  }
  // 8.7. Validate pagination metadata
  TestValidator.predicate(
    "pagination records matches data length",
    () => snapshotsPage.pagination.records >= snapshotsPage.data.length,
  );
  TestValidator.predicate(
    "pagination current is valid",
    () => snapshotsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () => snapshotsPage.pagination.limit >= 1,
  );
}
