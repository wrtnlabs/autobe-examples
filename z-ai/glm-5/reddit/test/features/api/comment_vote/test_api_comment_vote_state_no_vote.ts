import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test retrieving vote state when the authenticated user has not voted on the comment.
 *
 * **Setup Steps:**
 * 1. Register and authenticate as a new member
 * 2. Create a community with unique name and description
 * 3. Create a text post within the created community
 * 4. Create a comment on the post
 * 5. Do NOT cast any vote on the comment
 *
 * **Test Execution:**
 * - Call GET /community/member/comments/{commentId}/vote with the authenticated member who has not voted
 *
 * **Expected Results:**
 * - Response status: 200 OK
 * - Response body: null (indicating no vote exists for this user on this comment)
 */
export async function test_api_comment_vote_state_no_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Create a text post within the community
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: {
        post_type: "TEXT",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(comment);
  // 5. Retrieve vote state without casting any vote
  const voteState = await api.functional.community.member.comments._vote.at(
    memberConnection,
    {
      commentId: comment.id,
    },
  );
  // 6. Validate that no vote exists (should be null)
  TestValidator.equals(
    "vote state should be null when no vote cast",
    voteState,
    null,
  );
}
