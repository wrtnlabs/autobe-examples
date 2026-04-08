import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Retrieve and verify an immutable administrator review snapshot.
 *
 * This test validates that an authenticated administrator can access a review
 * snapshot detail endpoint and receive a stable historical record suitable for
 * audit and dispute resolution.
 *
 * 1. Register and authenticate an administrator using the required utility.
 * 2. Retrieve one review snapshot by reviewId and snapshotId.
 * 3. Assert the returned payload conforms to IMallPlatformReviewSnapshot.
 * 4. Call the endpoint again with the same identifiers and confirm the
 *    snapshot values remain unchanged.
 */
export async function test_api_review_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await api.functional.mallPlatform.administrator.reviews.snapshots.at(
      adminConnection,
      {
        reviewId,
        snapshotId,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.administrator.reviews.snapshots.at(
      adminConnection,
      {
        reviewId,
        snapshotId,
      },
    );
  typia.assert(second);
  TestValidator.equals("review snapshot retrieval is stable", second, first);
}
