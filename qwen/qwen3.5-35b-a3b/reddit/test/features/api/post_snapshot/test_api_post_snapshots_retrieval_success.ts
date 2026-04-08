import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_snapshots_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create actor-specific connection for snapshot retrieval
  const snapshotConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Generate a valid UUID for snapshot retrieval
  // Note: In production, this would come from a post creation/audit event
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the post snapshot
  const snapshot = await api.functional.redditPlatform.member.post_snapshots.at(
    snapshotConnection,
    {
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 5. Validate response structure and field types
  TestValidator.equals("snapshot id exists", snapshot.id, snapshotId);
  TestValidator.equals(
    "snapshot has title",
    snapshot.title.length,
    snapshot.title.length,
  );
  TestValidator.equals(
    "snapshot has post_type",
    typeof snapshot.post_type,
    typeof snapshot.post_type,
  );
  TestValidator.equals(
    "snapshot has author_id",
    typeof snapshot.author.id,
    typeof snapshot.author.id,
  );
  TestValidator.equals(
    "snapshot has community_id",
    typeof snapshot.community.id,
    typeof snapshot.community.id,
  );
  TestValidator.equals(
    "snapshot has vote counts",
    typeof snapshot.upvotes_count,
    typeof snapshot.upvotes_count,
  );
  TestValidator.equals(
    "snapshot has comment count",
    typeof snapshot.comment_count,
    typeof snapshot.comment_count,
  );
  TestValidator.equals(
    "snapshot has score",
    typeof snapshot.score,
    typeof snapshot.score,
  );
  TestValidator.equals(
    "snapshot has snapshot_type",
    typeof snapshot.snapshot_type,
    typeof snapshot.snapshot_type,
  );
  TestValidator.equals(
    "snapshot has created_at",
    typeof snapshot.created_at,
    typeof snapshot.created_at,
  );
  // Validate author summary fields
  TestValidator.equals(
    "author has id",
    typeof snapshot.author.id,
    typeof snapshot.author.id,
  );
  TestValidator.equals(
    "author has username",
    typeof snapshot.author.username,
    typeof snapshot.author.username,
  );
  TestValidator.equals(
    "author has karma",
    typeof snapshot.author.karma,
    typeof snapshot.author.karma,
  );
  TestValidator.equals(
    "author has created_at",
    typeof snapshot.author.created_at,
    typeof snapshot.author.created_at,
  );
  // Validate community summary fields
  TestValidator.equals(
    "community has id",
    typeof snapshot.community.id,
    typeof snapshot.community.id,
  );
  TestValidator.equals(
    "community has name",
    typeof snapshot.community.name,
    typeof snapshot.community.name,
  );
  TestValidator.equals(
    "community has subscriber_count",
    typeof snapshot.community.subscriber_count,
    typeof snapshot.community.subscriber_count,
  );
  // Validate post reference fields
  TestValidator.equals(
    "post has id",
    typeof snapshot.post.id,
    typeof snapshot.post.id,
  );
  TestValidator.equals(
    "post has title",
    typeof snapshot.post.title,
    typeof snapshot.post.title,
  );
  TestValidator.equals(
    "post has post_type",
    typeof snapshot.post.post_type,
    typeof snapshot.post.post_type,
  );
  // Validate score calculation: score = upvotes - downvotes
  const expectedScore = snapshot.upvotes_count - snapshot.downvotes_count;
  TestValidator.equals("score calculation", snapshot.score, expectedScore);
  // Validate snapshot_type is valid enum value
  const validSnapshotTypes = ["initial", "edit", "delete"] as const;
  TestValidator.predicate(
    "snapshot_type is valid",
    validSnapshotTypes.includes(snapshot.snapshot_type as any),
  );
  // Validate post_type is valid enum value
  const validPostTypes = ["text", "link", "image"] as const;
  TestValidator.predicate(
    "post_type is valid",
    validPostTypes.includes(snapshot.post_type as any),
  );
  // Validate content is null for non-text post types
  if (snapshot.post_type !== "text") {
    TestValidator.equals("content null for non-text", snapshot.content, null);
  }
}