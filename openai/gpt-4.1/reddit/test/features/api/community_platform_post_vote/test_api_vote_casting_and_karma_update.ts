import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate post voting: upvote, update, duplicate, downvote, self-vote
 * (rejected).
 *
 * 1. Register/authenticate member
 * 2. Create community
 * 3. Create post in community
 * 4. Upvote the post; verify vote record
 * 5. Upvote again (should update, not duplicate); verify same voter, post, and
 *    updated time
 * 6. Downvote (should update existing record); check vote value flips to -1
 * 7. Attempt self-vote (by using post author/member context); expect error
 * 8. Validate all business rule protections and field values
 */
export async function test_api_vote_casting_and_karma_update(
  connection: api.IConnection,
) {
  // 1. Register/authenticate member (as voter & author)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a community
  const communityInput = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    slug: RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityInput },
    );
  typia.assert(community);

  // 3. Create post
  const postInput = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    content_body: RandomGenerator.content({ paragraphs: 1 }),
    content_type: "text",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postInput,
    });
  typia.assert(post);

  // 4. Upvote the post
  const upvoteInput = {
    vote_value: 1 as const,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const upvote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      { postId: post.id, body: upvoteInput },
    );
  typia.assert(upvote);
  TestValidator.equals(
    "vote value should be 1 after upvote",
    upvote.vote_value,
    1,
  );
  TestValidator.equals(
    "correct post voted",
    upvote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "voter matches member",
    upvote.community_platform_member_id,
    member.id,
  );

  // 5. Duplicate upvote (should update not duplicate)
  const upvoteAgain: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      { postId: post.id, body: upvoteInput },
    );
  typia.assert(upvoteAgain);
  TestValidator.equals(
    "repeat upvote does not create duplicate",
    upvoteAgain.id,
    upvote.id,
  );
  TestValidator.equals(
    "updated_at timestamp must be different if updated",
    upvoteAgain.updated_at !== upvote.updated_at,
    true,
  );
  TestValidator.equals(
    "vote value remains 1 after second upvote",
    upvoteAgain.vote_value,
    1,
  );

  // 6. Downvote (should update existing vote, not duplicate)
  const downvoteInput = {
    vote_value: -1 as const,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const downvote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      { postId: post.id, body: downvoteInput },
    );
  typia.assert(downvote);
  TestValidator.equals(
    "vote id is steady across update",
    downvote.id,
    upvote.id,
  );
  TestValidator.equals("vote value is now -1", downvote.vote_value, -1);
  TestValidator.equals(
    "still correct post",
    downvote.community_platform_post_id,
    post.id,
  );

  // 7. Self-vote test: author tries to vote their own post (already the context, so this is a repeat vote as self)
  await TestValidator.error(
    "self-vote as post author is rejected",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.create(
        connection,
        { postId: post.id, body: upvoteInput },
      );
    },
  );
}
