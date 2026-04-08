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
 * Verify administrator review summary aggregation for active reviews only.
 *
 * Validates that the administrator-only product review summary endpoint returns a single aggregate summary object for a valid product identifier, and that the response conforms to the active-review summary contract by exposing only the aggregate fields used for product reputation display.
 *
 * The test also confirms the endpoint behaves as a read-only lookup by ensuring the returned payload is limited to the summary shape and does not include any review list or mutation-oriented fields.
 *
 * 1. Authenticate as an administrator through an isolated connection.
 * 2. Request the review summary for a valid product identifier.
 * 3. Assert that the response matches the expected summary DTO shape.
 */
export async function test_api_product_review_summary_active_reviews(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.products.reviewSummary.at(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "review summary response should contain only aggregate fields",
    Object.keys(output).sort(),
    ["averageRating", "reviewCount"],
  );
  TestValidator.predicate(
    "review count should be a non-negative integer",
    Number.isInteger(output.reviewCount) && output.reviewCount >= 0,
  );
  TestValidator.predicate(
    "average rating should be within the expected 0 to 5 range",
    output.averageRating >= 0 && output.averageRating <= 5,
  );
}
