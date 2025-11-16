import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate that deleting a post vote clears the member user's voting state by
 * removing the underlying community_platform_post_votes row.
 *
 * Business workflow covered by this test:
 *
 * 1. A guest joins the platform as a memberUser and becomes authenticated.
 * 2. The authenticated memberUser creates a community.
 * 3. The memberUser creates a post in that community.
 * 4. The memberUser casts a vote on the post and we capture the vote id.
 * 5. The same memberUser calls DELETE
 *    /communityPlatform/memberUser/posts/{postId}/votes/{voteId}.
 * 6. A second delete attempt on the same {postId, voteId} pair must fail,
 *    demonstrating that the first delete removed the vote row.
 */
export async function test_api_post_vote_delete_to_clear_vote(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinInput = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinInput,
    });
  typia.assert(member);

  // 2. Create a community as this member user
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a post in the created community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post should belong to the created community",
    post.community_id,
    community.id,
  );

  // 4. Cast a vote on the post
  const voteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: voteBody,
      },
    );
  typia.assert(vote);

  TestValidator.equals(
    "vote should reference the correct post",
    vote.post_id,
    post.id,
  );
  TestValidator.equals(
    "vote should be owned by the joined member",
    vote.memberuser_id,
    member.id,
  );

  // 5. Delete the vote to clear voting state
  await api.functional.communityPlatform.memberUser.posts.votes.erase(
    connection,
    {
      postId: post.id,
      voteId: vote.id,
    },
  );

  // 6. A second delete on the same vote should fail, proving the row is gone
  await TestValidator.error(
    "second delete on same vote must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.votes.erase(
        connection,
        {
          postId: post.id,
          voteId: vote.id,
        },
      );
    },
  );
}
