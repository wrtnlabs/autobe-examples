import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
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
import { generate_random_reddit_platform_member_posts_vote } from "../../../generate/generate_random_reddit_platform_member_posts_vote";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first member (post author)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberAuth = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstMemberAuth);
  // 2. Create a placeholder community ID (community creation not available via SDK)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. First member creates a post
  const post = await api.functional.redditPlatform.member.posts.create(
    firstMemberConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // Capture initial upvotes count
  const initialUpvotes = post.upvotes_count;
  // 4. Authenticate second member (voter)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondMemberAuth);
  // 5. Second member casts an upvote on the first member's post
  const vote = await api.functional.redditPlatform.member.posts.vote(
    secondMemberConnection,
    {
      postId: post.id,
      body: {
        vote_type: "up" as const,
      },
    },
  );
  typia.assert(vote);
  // 6. Validate vote record
  TestValidator.equals("vote type is up", vote.vote_type, "up");
  TestValidator.equals(
    "vote author is second member",
    vote.author.id,
    secondMemberAuth.id,
  );
  TestValidator.equals("vote post matches", vote.post.id, post.id);
  TestValidator.notEquals(
    "vote has created_at timestamp",
    vote.created_at,
    null,
  );
  TestValidator.notEquals(
    "vote has updated_at timestamp",
    vote.updated_at,
    null,
  );
  // 7. Validate post metadata in vote response
  TestValidator.equals(
    "vote response post has correct upvotes_count",
    vote.post.upvotes_count,
    initialUpvotes + 1,
  );
  // 8. Validate post metadata in vote response
  TestValidator.equals(
    "vote response post has correct author",
    vote.post.author.id,
    firstMemberAuth.id,
  );
  TestValidator.equals(
    "vote response post author username matches",
    vote.post.author.username,
    firstMemberAuth.username,
  );
  TestValidator.equals(
    "vote response post community matches",
    vote.post.community.id,
    communityId,
  );
}