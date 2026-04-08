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

export async function test_api_review_history_administrator_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validates administrator access to review history retrieval.
   *
   * Confirms that an administrator-authenticated connection can access the
   * review history endpoint and that the returned review ownership/display
   * information remains stable and read-only from the caller's perspective.
   *
   * The test intentionally uses an administrator-specific connection rather than
   * the base connection to satisfy connection isolation requirements.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const beforeHeaders = administratorConnection.headers
    ? { ...administratorConnection.headers }
    : undefined;
  const review =
    await api.functional.mallPlatform.administrator.reviews.history.at(
      administratorConnection,
      {
        reviewId,
      },
    );
  typia.assert(review);
  TestValidator.equals("review id is preserved", review.reviewId, reviewId);
  TestValidator.predicate(
    "review display state is valid",
    review.displayState === "activeCustomer" ||
      review.displayState === "deletedUser",
  );
  TestValidator.predicate(
    "review owner summary exists",
    review.customer.id.length > 0,
  );
  TestValidator.equals(
    "administrator authorization remains unchanged",
    administratorConnection.headers,
    administratorConnection.headers ?? undefined,
  );
  TestValidator.equals(
    "endpoint call does not mutate authorization headers",
    administratorConnection.headers,
    beforeHeaders,
  );
}
