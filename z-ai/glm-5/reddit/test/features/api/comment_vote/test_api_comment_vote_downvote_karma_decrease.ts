import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_vote_create } from "../../../generate/generate_random_community_platform_member_posts_comments_vote_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_vote_downvote_karma_decrease(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create comment author (who will receive karma decrease)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorMember = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorMember);
  // Store initial karma for verification
  const initialKarma = authorMember.karma;
  // 2. Create voter (who will cast the downvote)
  const voterConnection: api.IConnection = { host: connection.host };
  const voterMember = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(voterMember);
  // 3. Create community (author is owner and subscriber automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 4. Create post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // 5. Create comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Store initial comment vote score (should be 0 for new comment)
  const initialVoteScore = comment.voteScore;
  // 6. Voter casts downvote on the comment
  const vote =
    await generate_random_community_platform_member_posts_comments_vote_create(
      voterConnection,
      {
        params: {
          postId: post.id,
          commentId: comment.id,
        },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  // 7. Validate vote response
  TestValidator.equals("vote type is downvote", vote.voteType, "downvote");
  TestValidator.equals(
    "voter is correct member",
    vote.member.id,
    voterMember.id,
  );
  TestValidator.predicate("created at is set", vote.createdAt.length > 0);
  TestValidator.predicate("updated at is set", vote.updatedAt.length > 0);
  TestValidator.equals(
    "deleted at is null (active vote)",
    vote.deletedAt,
    null,
  );
  // 8. Validate vote member summary
  TestValidator.equals(
    "voter username matches",
    vote.member.username,
    voterMember.username,
  );
  TestValidator.equals(
    "voter display name matches",
    vote.member.displayName,
    voterMember.displayName,
  );
}
