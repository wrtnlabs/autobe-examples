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

/**
 * Verifies that the administrator review summary endpoint rejects a missing product.
 *
 * This test authenticates an administrator, then requests the review summary for a
 * non-existent product identifier and confirms the service responds with a not-found
 * error instead of fabricating an aggregate summary.
 *
 * 1. Register and authenticate an administrator through the utility function.
 * 2. Request a review summary for a randomly generated UUID that does not exist.
 * 3. Validate that the endpoint returns a not-found HTTP error.
 */
export async function test_api_product_review_summary_product_not_found(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "product review summary should fail for missing product",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.reviewSummary.at(
        administratorConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
