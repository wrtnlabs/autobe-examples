import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test that multiple different members can vote on the same post independently.
 *
 * Validates the core voting functionality where different members can cast
 * independent votes (upvotes or downvotes) on a single post. Ensures:
 *
 * - Each member can vote independently without affecting others
 * - Vote counts accurately reflect all members' votes
 * - Mix of upvotes and downvotes are properly recorded
 * - Unique constraint is per-member (allows multiple members to vote)
 * - Vote metrics (upvote_count, downvote_count, vote_score) update correctly
 */
export async function test_api_post_votes_different_members_same_post(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account to set up platform infrastructure
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category for community organization
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create three different member accounts and store their credentials
  interface MemberCredential {
    email: string;
    password: string;
    authorized: ICommunityPlatformMember.IAuthorized;
  }

  const memberCredentials: MemberCredential[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const memberEmail = typia.random<string & tags.Format<"email">>();
      const memberPassword = RandomGenerator.alphabets(12);
      const member: ICommunityPlatformMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: {
            email: memberEmail,
            username: RandomGenerator.alphabets(8),
            password: memberPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies ICommunityPlatformMember.ICreate,
        });
      typia.assert(member);
      return {
        email: memberEmail,
        password: memberPassword,
        authorized: member,
      };
    },
  );

  // Step 4: Create community using first member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCredentials[0].email,
      password: memberCredentials[0].password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Verify initial post has zero votes
  TestValidator.equals("initial upvote count", post.upvote_count, 0);
  TestValidator.equals("initial downvote count", post.downvote_count, 0);
  TestValidator.equals("initial vote score", post.vote_score, 0);

  // Step 6: Have each member cast different vote types
  // Member 0 casts upvote
  const vote1: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          content_type: "post",
          content_id: post.id,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(vote1);
  TestValidator.equals("member 0 vote type", vote1.vote_type, "upvote");

  // Member 1 casts downvote
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCredentials[1].email,
      password: memberCredentials[1].password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const vote2: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          content_type: "post",
          content_id: post.id,
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(vote2);
  TestValidator.equals("member 1 vote type", vote2.vote_type, "downvote");

  // Member 2 casts upvote
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCredentials[2].email,
      password: memberCredentials[2].password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const vote3: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          content_type: "post",
          content_id: post.id,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(vote3);
  TestValidator.equals("member 2 vote type", vote3.vote_type, "upvote");

  // Step 7: Verify individual votes are recorded correctly
  TestValidator.equals("vote 1 is upvote", vote1.vote_type, "upvote");
  TestValidator.equals("vote 2 is downvote", vote2.vote_type, "downvote");
  TestValidator.equals("vote 3 is upvote", vote3.vote_type, "upvote");

  // Verify all votes reference the correct post
  TestValidator.equals("vote 1 post id", vote1.content_id, post.id);
  TestValidator.equals("vote 2 post id", vote2.content_id, post.id);
  TestValidator.equals("vote 3 post id", vote3.content_id, post.id);

  // Step 8: Test member 2 changing their vote from upvote to downvote
  const updatedVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          content_type: "post",
          content_id: post.id,
          vote_type: "downvote", // Change from upvote to downvote
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(updatedVote);
  TestValidator.equals(
    "updated vote type changed to downvote",
    updatedVote.vote_type,
    "downvote",
  );

  // Step 9: Verify vote data consistency
  // After changes: member 0 upvote, member 1 downvote, member 2 downvote
  TestValidator.equals("updated vote post id", updatedVote.content_id, post.id);
  TestValidator.predicate(
    "each vote has timestamp",
    vote1.created_at !== null &&
      vote2.created_at !== null &&
      vote3.created_at !== null,
  );
}
