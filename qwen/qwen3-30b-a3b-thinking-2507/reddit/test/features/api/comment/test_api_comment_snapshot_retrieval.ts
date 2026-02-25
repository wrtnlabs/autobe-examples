import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import type { IRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_posts_comments_create } from "../../../generate/generate_random_reddit_member_posts_comments_create";
import { prepare_random_reddit_comment } from "../../../prepare/prepare_random_reddit_comment";

export async function test_api_comment_snapshot_retrieval(
  connection: api.IConnection,
) {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Create test comment
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment: IRedditComment =
    await generate_random_reddit_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: "Initial comment content",
        } satisfies IRedditComment.ICreate,
        params: { postId },
      },
    );
  typia.assert(comment);
  // 3. Generate snapshot (triggered by comment edit)
  const snapshot: IRedditProfileSnapshot =
    await api.functional.reddit.member.comments.snapshots.createSnapshot(
      memberConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(snapshot);
  // 4. Retrieve snapshot
  const retrievedSnapshot: IRedditProfileSnapshot =
    await api.functional.reddit.member.comments.snapshots.at(memberConnection, {
      commentId: comment.id,
      snapshotId: snapshot.id,
    });
  typia.assert(retrievedSnapshot);
  // 5. Validate expected snapshot content
  TestValidator.equals(
    "snapshot content matches initial comment",
    retrievedSnapshot.content,
    "Initial comment content",
  );
}
