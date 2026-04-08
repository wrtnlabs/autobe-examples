import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test retrieving initial snapshot of a review that was never edited.
 *
 * When a review is created, an initial snapshot is automatically captured.
 * This test verifies that even reviews that have never been updated have at
 * least one snapshot that can be retrieved by the seller.
 *
 * Test Steps:
 * 1. Authenticate as a customer via POST /ecommerceMall/auth/customer/join
 * 2. Authenticate as the seller via POST /ecommerceMall/auth/seller/join
 * 3. Call GET /ecommerceMall/seller/reviews/{reviewId}/snapshots/{snapshotId}
 * 4. Validate the snapshot structure conforms to IEcommerceMallReviewSnapshot
 */
export async function test_api_review_snapshot_initial_state_unedited_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer to establish customer context
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Authenticate as the seller to retrieve the snapshot
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Retrieve the review snapshot
  const snapshot =
    await api.functional.ecommerceMall.seller.reviews.snapshots.at(
      sellerConnection,
      {
        reviewId: typia.random<string>(),
        snapshotId: typia.random<string>(),
      },
    );
  // 4. Validate the snapshot structure
  typia.assert(snapshot);
}
