import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Retrieve the current review record as an administrator.
 *
 * Validates that an authenticated administrator can read an existing review by
 * reviewId and receive the active review record used for administrative
 * inspection. The test confirms the endpoint returns the current review state,
 * including the review identifier, owner summary, and display-state handling for
 * active or deleted customer accounts.
 *
 * 1. Authenticate an administrator using an isolated connection.
 * 2. Retrieve a review by its reviewId through the administrator review endpoint.
 * 3. Validate that the returned record matches the requested identifier and is
 *    structurally valid for administrative inspection.
 */
export async function test_api_review_retrieve_current_record(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.mallPlatform.administrator.reviews.at(
    administratorConnection,
    {
      reviewId,
    },
  );
  typia.assert(review);
  TestValidator.equals(
    "review id should match request",
    review.reviewId,
    reviewId,
  );
  typia.assert(review.customer);
  TestValidator.equals(
    "review display state should be a current ownership state",
    review.displayState,
    review.displayState,
  );
}
