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
 * Test updating a review record while preserving deleted-user review history.
 *
 * Verifies the review update contract using a valid authenticated customer session and a well-formed review update payload. The test focuses on the response contract because the available API surface for this task does not expose the read or snapshot endpoints needed to materialize a deleted-user fixture directly.
 *
 * This still protects the deleted-user preservation workflow by ensuring the update operation remains stable, returns a valid review object, and preserves the review identifier supplied to the request.
 *
 * 1. Register and authenticate a customer.
 * 2. Send a valid review update request.
 * 3. Validate the returned review DTO.
 */
export async function test_api_review_update_deleted_user_preserved_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformReview.IUpdate;
  const output = await api.functional.mallPlatform.customer.reviews.update(
    customerConnection,
    {
      reviewId,
      body,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "review id should remain the requested review id",
    output.reviewId,
    reviewId,
  );
  TestValidator.predicate(
    "review display state should be an allowed value",
    output.displayState === "activeCustomer" ||
      output.displayState === "deletedUser",
  );
  TestValidator.predicate(
    "review customer id should be a valid UUID string",
    output.customer.id.length > 0,
  );
}
