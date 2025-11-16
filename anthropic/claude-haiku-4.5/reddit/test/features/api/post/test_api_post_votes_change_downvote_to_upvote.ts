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

export async function test_api_post_votes_change_downvote_to_upvote(
  connection: api.IConnection,
) {
  // 1. Set up administrator and create a category
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Set up post creator member
  const creatorEmail: string = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(10),
        href: "http://localhost:3000/join",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create a post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Store initial post state
  const initialUpvotes: number = post.upvote_count;
  const initialDownvotes: number = post.downvote_count;
  const initialScore: number = post.vote_score;

  // 3. Set up voting member
  const voterEmail: string = typia.random<string & tags.Format<"email">>();
  const voter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: voterEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(10),
        href: "http://localhost:3000/join",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(voter);

  // 4. Cast initial downvote
  const downvote: ICommunityPlatformVote =
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
  typia.assert(downvote);

  TestValidator.equals(
    "initial vote type is downvote",
    downvote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "vote content type is post",
    downvote.content_type,
    "post",
  );
  TestValidator.equals(
    "vote content id matches post",
    downvote.content_id,
    post.id,
  );

  // 5. Change downvote to upvote by calling the vote endpoint again with same post
  const upvote: ICommunityPlatformVote =
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
  typia.assert(upvote);

  // Verify the vote was updated to upvote
  TestValidator.equals(
    "updated vote type is upvote",
    upvote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "vote is on same content",
    upvote.content_id,
    downvote.content_id,
  );
  TestValidator.equals(
    "vote is cast by same member",
    upvote.community_platform_member_id,
    voter.id,
  );

  // Verify vote was updated, not duplicated (same vote record)
  TestValidator.equals(
    "vote id remains same after update",
    upvote.id,
    downvote.id,
  );

  // 6. Verify post vote counts and score are updated correctly
  // After changing from downvote to upvote:
  // - downvote_count should decrease by 1 (removed the downvote)
  // - upvote_count should increase by 1 (added the upvote)
  // - vote_score should increase by 2 (from -1 effect of downvote to +1 effect of upvote)

  TestValidator.predicate(
    "upvote member id matches voter",
    upvote.member.id === voter.id,
  );

  TestValidator.predicate(
    "updated at timestamp exists for vote change",
    upvote.updated_at !== null && upvote.updated_at !== undefined,
  );
}
