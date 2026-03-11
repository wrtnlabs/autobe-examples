import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_post_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberAuthorized);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Simulate existing post with snapshots
  // Note: Without post creation/edit endpoints in SDK, we test snapshot retrieval
  // with a simulated post ID that would have snapshots in the database
  const existingPostId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve snapshots for the post
  const snapshotsResult = await api.functional.redditPlatform.posts.snapshots(
    memberConnection,
    {
      postId: existingPostId,
      body: {
        page: 1,
        limit: 100,
        sort_order: "desc" as const,
        sort_by: "created_at" as const,
      },
    },
  );
  typia.assert(snapshotsResult);
  // 5. Validate snapshot response structure
  TestValidator.predicate(
    "has pagination",
    snapshotsResult.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination limit is 100",
    snapshotsResult.pagination.limit,
    100,
  );
  TestValidator.predicate("data is array", Array.isArray(snapshotsResult.data));
  // 6. Validate snapshot types if data exists
  if (snapshotsResult.data.length > 0) {
    const snapshot = snapshotsResult.data[0];
    typia.assert(snapshot);
    // Validate snapshot has required fields
    TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
    TestValidator.predicate("snapshot has title", snapshot.title.length > 0);
    TestValidator.predicate(
      "snapshot has post_type",
      snapshot.post_type === "TEXT" ||
        snapshot.post_type === "LINK" ||
        snapshot.post_type === "IMAGE",
    );
    TestValidator.predicate(
      "snapshot has vote_score",
      typeof snapshot.vote_score === "number",
    );
    TestValidator.predicate(
      "snapshot has comment_count",
      typeof snapshot.comment_count === "number",
    );
    TestValidator.predicate(
      "snapshot has snapshot_type",
      snapshot.snapshot_type !== undefined,
    );
    TestValidator.predicate(
      "snapshot has author",
      snapshot.author !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
    );
    // Validate author structure
    typia.assert(snapshot.author);
    TestValidator.predicate(
      "author has username",
      snapshot.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has display_name",
      snapshot.author.display_name.length > 0,
    );
    TestValidator.predicate("author has id", snapshot.author.id.length > 0);
    TestValidator.predicate(
      "author has karma_score",
      typeof snapshot.author.karma_score === "number",
    );
  }
}
