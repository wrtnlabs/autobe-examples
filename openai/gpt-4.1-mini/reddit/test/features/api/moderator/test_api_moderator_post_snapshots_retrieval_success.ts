import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import typia, { tags } from "typia";
import { TestValidator } from "@nestia/e2e";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";

export async function test_api_moderator_post_snapshots_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Moderator join and authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityPlatformModerator.IJoin,
  });

  const postId = typia.random<string & tags.Format<"uuid">>();
  const emptySnapshots = await api.functional.communityPlatform.moderator.posts.snapshots.indexSnapshots(
    moderatorConnection,
    { postId },
  );
  typia.assert(emptySnapshots);
  TestValidator.equals(
    "empty snapshot list should have zero items",
    emptySnapshots.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination current page >= 1",
    emptySnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    emptySnapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    emptySnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    emptySnapshots.pagination.pages >= 0,
  );

  const postIdWithSnapshots = typia.random<string & tags.Format<"uuid">>();
  const snapshots = await api.functional.communityPlatform.moderator.posts.snapshots.indexSnapshots(
    moderatorConnection,
    { postId: postIdWithSnapshots },
  );
  typia.assert(snapshots);
  TestValidator.predicate(
    "pagination limit should be positive",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current page should be >= 1",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    snapshots.pagination.records >= 0,
  );

  for (let i = 0; i < snapshots.data.length; i++) {
    const snapshot = snapshots.data[i];
    typia.assert(snapshot);
  }
}
