import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_review_summary_empty_state(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify the administrator review summary endpoint returns an empty-state aggregate for a product with no active reviews.
   *
   * This test authenticates an administrator, queries the review summary for a product identifier, and confirms the endpoint returns a valid aggregate object with zero review count and zero average rating when no active reviews are present.
   *
   * 1. Authenticate as an administrator using a dedicated connection derived from the base connection.
   * 2. Request the product review summary for a generated product identifier.
   * 3. Validate that the response is a proper IMallPlatformProductReview empty-state summary.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const summary =
    await api.functional.mallPlatform.administrator.products.reviewSummary.at(
      administratorConnection,
      {
        productId,
      },
    );
  typia.assert(summary);
  TestValidator.equals("empty review count", summary.reviewCount, 0);
  TestValidator.equals("empty average rating", summary.averageRating, 0);
}
