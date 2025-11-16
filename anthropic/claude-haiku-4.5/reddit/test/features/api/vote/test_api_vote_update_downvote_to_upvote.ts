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

export async function test_api_vote_update_downvote_to_upvote(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator and category for test setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create a member account to perform voting operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a community for posting
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

  // Step 4: Create a post that will receive the vote
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

  // Step 5: Create an initial downvote on the post
  const initialVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(initialVote);

  TestValidator.equals(
    "initial vote should be downvote",
    initialVote.vote_type,
    "downvote",
  );
  const initialUpdatedAt = initialVote.updated_at;

  // Step 6: Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 7: Update the downvote to an upvote
  const updatedVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.update(connection, {
      voteId: initialVote.id,
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.IUpdate,
    });
  typia.assert(updatedVote);

  // Step 8: Verify the vote has been successfully updated
  TestValidator.equals(
    "updated vote should be upvote",
    updatedVote.vote_type,
    "upvote",
  );

  TestValidator.equals(
    "vote id should remain the same",
    updatedVote.id,
    initialVote.id,
  );

  TestValidator.predicate(
    "updated_at timestamp should be refreshed",
    updatedVote.updated_at !== initialUpdatedAt,
  );

  TestValidator.equals(
    "content_type should remain post",
    updatedVote.content_type,
    "post",
  );

  TestValidator.equals(
    "content_id should remain the same",
    updatedVote.content_id,
    post.id,
  );
}
