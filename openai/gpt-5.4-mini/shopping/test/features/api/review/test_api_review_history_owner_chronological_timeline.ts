import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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
import { generate_random_mall_platform_customer_reviews_create } from "../../../generate/generate_random_mall_platform_customer_reviews_create";
import { prepare_random_mall_platform_review } from "../../../prepare/prepare_random_mall_platform_review";

/**
 * Test review history retrieval for the review owner using the available ownership timeline view.
 *
 * Verifies that a seller-authenticated caller can request the review history for a review that was created by a customer after authentication. The test focuses on the owner-access path and validates that reading the history endpoint preserves the review identifier, customer ownership, and display state without mutating the active review entity.
 *
 * 1. Create isolated customer and seller connections from the base host.
 * 2. Register authenticated customer and seller actors using the provided helper functions.
 * 3. Create a review through the customer review endpoint helper.
 * 4. Fetch the history view as the seller actor using the review identifier.
 * 5. Validate that the returned data preserves the same owner metadata and remains read-only.
 */
export async function test_api_review_history_owner_chronological_timeline(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerEmail = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const sellerEmail = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const password = "1234";
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const createdReview =
    await generate_random_mall_platform_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformReview.ICreate,
      },
    );
  typia.assert(createdReview);
  const history = await api.functional.mallPlatform.seller.reviews.history.at(
    sellerConnection,
    {
      reviewId: createdReview.reviewId,
    },
  );
  typia.assert(history);
  TestValidator.equals(
    "review id is preserved",
    history.reviewId,
    createdReview.reviewId,
  );
  TestValidator.equals(
    "review customer id is preserved",
    history.customer.id,
    createdReview.customer.id,
  );
  TestValidator.equals(
    "review customer email is preserved",
    history.customer.email,
    createdReview.customer.email,
  );
  TestValidator.equals(
    "review display state is preserved",
    history.displayState,
    createdReview.displayState,
  );
  TestValidator.equals(
    "history request does not mutate the active review identifier",
    createdReview.reviewId,
    history.reviewId,
  );
}
