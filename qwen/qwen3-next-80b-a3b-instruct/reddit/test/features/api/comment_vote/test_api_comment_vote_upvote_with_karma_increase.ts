import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVoteRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVoteRequest";
import type { IRedditCommunityCommentVoteResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVoteResponse";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_vote_upvote_with_karma_increase(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin and member accounts
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdmin: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_join(platformAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Authenticate both users via login to get fresh sessions
  const platformAdminLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_platform_admin_login(platformAdminLoginConnection, {
    body: {
      email: (platformAdmin.email ?? "") satisfies string as string,
      password: platformAdmin.token.access,
    } satisfies IRedditCommunityPlatformAdmin.ILogin,
  });
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: (member.email ?? "") satisfies string as string,
      password: member.token.access,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 3. Member creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberLoginConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  // 4. Member creates a post in the community
  const post = await generate_random_reddit_community_member_posts_create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  // 5. Member creates a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberLoginConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  // 6. Save the member's karma before voting
  const preVoteKarma = member.karma_score;
  // 7. Platform admin upvotes the comment
  const voteResult =
    await api.functional.redditCommunity.platformAdmin.posts.comments.votes.create(
      platformAdminLoginConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          voteType: "upvote",
        } satisfies IRedditCommunityCommentVoteRequest,
      },
    );
  // 8. Validate vote result
  typia.assert(voteResult);
  // 9. Fetch updated comment to verify vote_score is updated
  const updatedComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberLoginConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(updatedComment);
  TestValidator.equals(
    "comment vote score increased by 1",
    voteResult.vote_score,
    updatedComment.vote_score,
  );
  // 10. Fetch updated member profile to verify karma increase
  const updatedMember = await api.functional.redditCommunity.auth.member.login(
    memberLoginConnection,
    {
      body: {
        email: (member.email ?? "") satisfies string as string,
        password: member.token.access,
      } satisfies IRedditCommunityMember.ILogin,
    },
  );
  typia.assert(updatedMember);
  TestValidator.equals(
    "member karma increased by 1",
    updatedMember.karma_score,
    preVoteKarma + 1,
  );
}
