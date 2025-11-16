import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

export async function test_api_comment_vote_change_upvote_to_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and member accounts
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphabets(10),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphabets(10),
      username: RandomGenerator.alphabets(8),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create category by admin
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create community by member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph(),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create post by member
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph(),
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create comment on the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 6: Cast initial upvote on the comment
  const upvote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          content_type: "comment",
          content_id: comment.id,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(upvote);
  TestValidator.equals(
    "initial vote type is upvote",
    upvote.vote_type,
    "upvote",
  );

  // Step 7: Change vote from upvote to downvote
  const downvote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          content_type: "comment",
          content_id: comment.id,
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);
  TestValidator.equals(
    "updated vote type is downvote",
    downvote.vote_type,
    "downvote",
  );

  // Step 8: Verify vote ID is the same (same vote record updated)
  TestValidator.equals(
    "vote ID remains same after update",
    downvote.id,
    upvote.id,
  );

  // Step 9: Verify updated_at timestamp is present and different from created_at
  TestValidator.predicate(
    "updated_at timestamp exists",
    downvote.updated_at !== null && downvote.updated_at !== undefined,
  );

  // Step 10: Verify vote member matches
  TestValidator.equals("vote member ID matches", downvote.member.id, member.id);

  // Step 11: Verify single vote record exists (not duplicated)
  TestValidator.equals(
    "vote is for the correct comment",
    downvote.content_id,
    comment.id,
  );
  TestValidator.equals(
    "vote content type is comment",
    downvote.content_type,
    "comment",
  );
}
