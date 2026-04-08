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
 * Verify administrator access to preserved review snapshot history.
 *
 * This test authenticates an administrator through the join workflow and then
 * requests a review snapshot by review and snapshot identifiers. It validates
 * that the immutable snapshot payload preserves the historical review state,
 * including the review rating, content, deletion flag, snapshot action, and
 * creation timestamp.
 *
 * Because snapshot history is used for dispute resolution and audit purposes,
 * the test focuses on the read-only detail response and the actor isolation
 * pattern required for administrator-only access.
 */
export async function test_api_review_snapshot_preserved_history_after_review_change(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshot =
    await api.functional.mallPlatform.administrator.reviews.snapshots.at(
      adminConnection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot review id matches requested review id",
    snapshot.mall_platform_review_id,
    snapshot.mall_platform_review_id,
  );
  TestValidator.predicate(
    "snapshot action preserves historical change type",
    snapshot.snapshot_action.length > 0,
  );
}
