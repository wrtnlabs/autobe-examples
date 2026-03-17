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

export async function test_api_comment_vote_comment_post_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create comment author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create first community (for post A)
  const communityA =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(communityA);
  // 3. Create post A in first community
  const postA =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      { params: { communityId: communityA.id } },
    );
  typia.assert(postA);
  // 4. Create second community (for post B)
  const communityB =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(communityB);
  // 5. Create post B in second community
  const postB =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      { params: { communityId: communityB.id } },
    );
  typia.assert(postB);
  // 6. Create a comment on post B (this comment belongs to post B)
  const commentOnPostB =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      { params: { postId: postB.id } },
    );
  typia.assert(commentOnPostB);
  // 7. Create voter member who will attempt to vote with mismatched post/comment IDs
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 8. Attempt to vote on the comment using post A's ID in the path,
  // but the comment actually belongs to post B
  // This should fail with HTTP error (400 Bad Request, 404 Not Found, or 422)
  await TestValidator.httpError(
    "should reject vote when comment does not belong to specified post",
    [400, 404, 422],
    async () => {
      await api.functional.communityPlatform.member.posts.comments.vote.create(
        voterConnection,
        {
          postId: postA.id,
          commentId: commentOnPostB.id,
          body: {
            vote_type: "upvote",
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    },
  );
}
