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

export async function test_api_review_snapshot_cross_review_scope_protection(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that review snapshots remain scoped to their owning review.
   *
   * Because the available E2E surface in this template only exposes the snapshot
   * lookup endpoint and administrator authentication, this test validates the
   * access-control contract by combining unrelated review and snapshot identifiers
   * and asserting the endpoint rejects the request with not found. This protects
   * the historical review trail from cross-review disclosure.
   *
   * 1. Register and authenticate an administrator through the supported auth utility.
   * 2. Call the review snapshot lookup with mismatched parent and snapshot identifiers.
   * 3. Confirm the endpoint responds with not found instead of returning a snapshot.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "cross-review snapshot lookup should be rejected as not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.reviews.snapshots.at(
        administratorConnection,
        {
          reviewId,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
