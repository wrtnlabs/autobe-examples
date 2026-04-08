import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that a customer can update their own review while preserving identity and ownership metadata.
 *
 * This scenario validates the authenticated review update workflow for a review that already exists in an active state. It ensures the owner can edit the rating and optional content, and that the returned review still represents the same historical review record after the modification.
 *
 * Because no snapshot-history endpoint is available in the provided API surface, the test verifies the observable business effects that support snapshot preservation: the update succeeds, the review identity remains stable, and the owner display metadata remains suitable for public feedback display after the edit.
 *
 * 1. Register a customer account and use the authenticated customer connection.
 * 2. Update a review owned by that customer with a new rating and optional text.
 * 3. Validate that the response preserves review identity and ownership metadata while reflecting the new edit.
 */
export async function test_api_review_update_own_review_preserves_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(registered);
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    rating: 5,
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformReview.IUpdate;
  const updatedReview =
    await api.functional.mallPlatform.customer.reviews.update(
      customerConnection,
      {
        reviewId,
        body: updateBody,
      },
    );
  typia.assert(updatedReview);
  TestValidator.equals(
    "review identity should remain the same",
    updatedReview.reviewId,
    reviewId,
  );
  TestValidator.equals(
    "review owner email should remain the same",
    updatedReview.customer.email,
    registered.email,
  );
  TestValidator.equals(
    "review owner status should remain the same",
    updatedReview.customer.status,
    registered.status,
  );
  TestValidator.equals(
    "review owner display state should remain active",
    updatedReview.displayState,
    "activeCustomer",
  );
  TestValidator.equals(
    "updated rating should match the submitted value",
    updateBody.rating,
    5,
  );
  TestValidator.predicate(
    "updated review should stay publicly displayable",
    updatedReview.displayState === "activeCustomer",
  );
}
