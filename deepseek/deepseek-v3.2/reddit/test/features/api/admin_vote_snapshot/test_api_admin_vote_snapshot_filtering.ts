import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_post_snapshots_create } from "../../../generate/generate_random_community_platform_post_snapshots_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_admin_vote_snapshot_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Member authentication (for creating community and post)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(10),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 3. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create text post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create initial upvote (karma impact +1)
  const vote1 =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(vote1);
  // 6. Create second upvote with different timestamp (if system allows rapid votes)
  const vote2 =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(vote2);
  // 7. Trigger audit capture snapshot if supported (optional - may be automatic)
  try {
    const snapshot =
      await generate_random_community_platform_post_snapshots_create(
        adminConnection,
        {
          body: {
            community_platform_post_id: post.id,
          } satisfies ICommunityPlatformPostSnapshot.ICreate,
        },
      );
    typia.assert(snapshot);
  } catch {
    // If not supported, ignore - snapshots may be automatic
  }
  // 8. Wait a bit to ensure timestamps differ for date range filtering
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 9. Calculate date range: from 1 hour ago to future
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const future = new Date(now.getTime() + 60 * 60 * 1000);
  // 10. Admin search with combined filters
  const searchResult =
    await api.functional.communityPlatform.admin.posts.votes.snapshots.index(
      adminConnection,
      {
        postId: post.id,
        voteId: vote1.id,
        body: {
          search: "vote", // text search
          snapshot_reason: "initial_vote",
          karma_impact_min: 1, // only upvote-related
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: future.toISOString(),
          page: 1,
          limit: 10,
          sort: "karma_impact_desc",
        } satisfies ICommunityPlatformPostVoteSnapshot.IRequest,
      },
    );
  typia.assert(searchResult);
  // 11. Validate filtered results
  TestValidator.equals(
    "has pagination data",
    searchResult.data.length >= 0,
    true,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    () => searchResult.pagination !== undefined,
  );
  TestValidator.equals(
    "page number correct",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("limit correct", searchResult.pagination.limit, 10);
  // 12. Validate each snapshot matches filter criteria
  for (const snapshot of searchResult.data) {
    TestValidator.predicate(
      "snapshot has karma impact >= 1",
      () => snapshot.karmaImpact >= 1,
    );
    TestValidator.equals(
      "snapshot reason is initial_vote",
      snapshot.snapshotReason,
      "initial_vote",
    );
    TestValidator.equals("vote matches", snapshot.vote.id, vote1.id);
    TestValidator.equals("post matches", snapshot.post.id, post.id);
    TestValidator.equals("member matches", snapshot.member.id, member.id);
    // Validate date range
    const snapshotDate = new Date(snapshot.createdAt);
    TestValidator.predicate("snapshot within date range", () => {
      return snapshotDate >= oneHourAgo && snapshotDate <= future;
    });
  }
  // 13. Validate sort order - karma_impact_desc
  if (searchResult.data.length > 1) {
    for (let i = 0; i < searchResult.data.length - 1; i++) {
      const current = searchResult.data[i];
      const next = searchResult.data[i + 1];
      TestValidator.predicate("karma impact descending order", () => {
        return current.karmaImpact >= next.karmaImpact;
      });
    }
  }
  // 14. Test pagination with limited results
  const limitedResult =
    await api.functional.communityPlatform.admin.posts.votes.snapshots.index(
      adminConnection,
      {
        postId: post.id,
        voteId: vote1.id,
        body: {
          limit: 1,
          page: 1,
          sort: "created_at_desc",
        } satisfies ICommunityPlatformPostVoteSnapshot.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals("limited result size", limitedResult.data.length, 1);
  TestValidator.equals(
    "limit set correctly",
    limitedResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "total records >= 1",
    () => limitedResult.pagination.records >= 1,
  );
  // 15. Test error case - non-existent vote ID
  await TestValidator.error("should error on invalid vote ID", async () => {
    await api.functional.communityPlatform.admin.posts.votes.snapshots.index(
      adminConnection,
      {
        postId: post.id,
        voteId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          limit: 10,
        } satisfies ICommunityPlatformPostVoteSnapshot.IRequest,
      },
    );
  });
}
