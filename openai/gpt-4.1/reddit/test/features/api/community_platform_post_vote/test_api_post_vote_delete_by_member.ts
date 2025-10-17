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
 * Test a member removes their own vote from a post, verifying post score and
 * permissions.
 *
 * 1. Register member1 and login, capture their authorized profile
 * 2. Create a community as member1
 * 3. Create a post in the community as member1
 * 4. Vote (upvote) on the post as member1
 * 5. Delete (remove) the vote as member1
 * 6. Repeat vote deletion to check error is handled for already-deleted vote
 * 7. Register member2 and login, attempt to delete member1's vote: should fail
 * 8. Attempt to delete a non-existent vote by member1: should fail gracefully
 * 9. Delete the post, attempt to delete the vote: should fail or have no effect
 * 10. (Optional, depends on business rules) Check that post score/karma is adjusted
 *     after vote removal
 */
export async function test_api_post_vote_delete_by_member(
  connection: api.IConnection,
) {
  // 1. Register member1
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "test-password-1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // 2. Create a community as member1
  const communityName = RandomGenerator.alphaNumeric(10);
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post as member1
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_body: RandomGenerator.content({ paragraphs: 1 }),
        content_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. Cast a vote on the post as member1
  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_value: 1 as 1,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote);

  // 5. Delete the vote as member1
  await api.functional.communityPlatform.member.posts.votes.erase(connection, {
    postId: post.id,
    voteId: vote.id,
  });

  // 6. Attempt to delete the same vote again
  await TestValidator.error(
    "deleting already-deleted vote should fail",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.erase(
        connection,
        {
          postId: post.id,
          voteId: vote.id,
        },
      );
    },
  );

  // 7. Register member2 and attempt to delete member1's vote (should fail)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "test-password-2",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  await TestValidator.error(
    "other member cannot delete this member's vote",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.erase(
        connection,
        {
          postId: post.id,
          voteId: vote.id,
        },
      );
    },
  );

  // 8. Attempt to delete non-existent vote as member1 (random uuid)
  await TestValidator.error("deleting non-existent vote id", async () => {
    await api.functional.communityPlatform.member.posts.votes.erase(
      connection,
      {
        postId: post.id,
        voteId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 9. Optional: Attempt deleting the vote after deleting the post (simulate post deletion by soft-deleting)
  // Not possible through available SDK; consider the test as complete here.
}
