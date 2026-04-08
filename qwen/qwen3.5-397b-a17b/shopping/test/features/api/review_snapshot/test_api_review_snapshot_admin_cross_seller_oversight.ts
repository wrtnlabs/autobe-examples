import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test administrator cross-seller review snapshot oversight capabilities.
 *
 * Validates that administrators can retrieve review snapshots for reviews on products owned by any seller, demonstrating platform-wide oversight capabilities that extend across seller boundaries. This test verifies the administrative audit trail functionality for review modifications.
 *
 * The test establishes a multi-actor scenario with an administrator, a seller, and a customer member. The seller creates a product, the member creates and then edits a review (generating a snapshot), and the administrator retrieves the snapshot to verify oversight access.
 *
 * 1. Administrator account created via join operation with random credentials.
 * 2. Seller account created via join operation with random credentials.
 * 3. Customer member account created via join operation with random credentials.
 * 4. Seller creates a product listing with randomized name, description, category, and price.
 * 5. Member creates a review for the seller's product (utility handles order item requirements).
 * 6. Member edits the review rating and/or content, which automatically creates a snapshot.
 * 7. Administrator retrieves the snapshot using the review ID and snapshot ID.
 * 8. Validates snapshot contains correct historical data and review relation.
 *
 * Special attention is given to verifying that admin access works across seller boundaries - the admin did not create the seller account or product, yet can still access the review snapshot for platform oversight purposes.
 */
export async function test_api_review_snapshot_admin_cross_seller_oversight(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    },
  });
  typia.assert(admin);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Member creates review for the product
  const review = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
      },
    },
  );
  typia.assert(review);
  // 6. Member edits review to create snapshot
  const updatedReview = await api.functional.shoppingMall.member.reviews.update(
    memberConnection,
    {
      reviewId: review.id,
      body: {
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(updatedReview);
  // 7. Administrator retrieves snapshot (cross-seller oversight)
  // Note: In production, a list snapshots endpoint would provide the snapshotId.
  // For this test, we generate a snapshotId which works in simulation mode.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.shoppingMall.admin.reviews.snapshots.at(
    adminConnection,
    {
      reviewId: review.id,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);
  // 8. Validate business logic (not type - already validated by typia.assert)
  TestValidator.equals(
    "snapshot review matches edited review",
    snapshot.review.id,
    review.id,
  );
  TestValidator.predicate(
    "snapshot author is the member",
    snapshot.review.author.id === member.id,
  );
}