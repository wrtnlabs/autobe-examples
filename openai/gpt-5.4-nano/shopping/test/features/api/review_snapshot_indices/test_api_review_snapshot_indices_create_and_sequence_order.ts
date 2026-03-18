import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_review_snapshot_indices_create_and_sequence_order(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // NOTE: No review creation/list endpoints are available in the provided
  // materials, so we must use an arbitrary UUID as the target.
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.createSnapshotIndices(
      memberConnection,
      {
        reviewId,
      },
    );
  typia.assert(first);
  TestValidator.equals("reviewId matches", first.reviewId, reviewId);
  TestValidator.predicate("actionType non-empty", first.actionType.length > 0);
  TestValidator.equals("deletedAt is null", first.deletedAt, null);
  const second =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.createSnapshotIndices(
      memberConnection,
      {
        reviewId,
      },
    );
  typia.assert(second);
  TestValidator.equals("reviewId matches (2)", second.reviewId, reviewId);
  TestValidator.predicate(
    "snapshotSequence increments by +1",
    second.snapshotSequence === first.snapshotSequence + 1,
  );
  TestValidator.equals("deletedAt is null (2)", second.deletedAt, null);
}
