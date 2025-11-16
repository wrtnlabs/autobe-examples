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

export async function test_api_comment_creation_establishes_creator(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account (who will be the comment creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(15),
      password: RandomGenerator.alphaNumeric(12),
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  const memberId = member.id;

  // 4. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Create comment on the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 7. Verify creator field is automatically set to authenticated member
  TestValidator.equals(
    "comment creator ID matches authenticated member",
    comment.creator.id,
    memberId,
  );

  // 8. Verify creator information is accurate
  TestValidator.equals(
    "comment creator email matches authenticated member email",
    comment.creator.email,
    memberEmail,
  );

  // 9. Verify post relationship is correct
  TestValidator.equals(
    "comment post ID matches created post",
    comment.post.id,
    post.id,
  );

  // 10. Verify comment structure is complete
  TestValidator.predicate(
    "comment has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      comment.id,
    ),
  );

  TestValidator.predicate(
    "comment content matches request",
    comment.content.length > 0,
  );

  TestValidator.equals(
    "comment visibility status is visible by default",
    comment.visibility_status,
    "visible",
  );

  TestValidator.predicate(
    "comment is not locked by default",
    !comment.is_locked,
  );

  TestValidator.equals(
    "comment nesting depth is 0 for top-level comment",
    comment.nesting_depth,
    0,
  );

  TestValidator.equals(
    "comment initial vote score is 0",
    comment.vote_score,
    0,
  );

  TestValidator.equals(
    "comment initial upvote count is 0",
    comment.upvote_count,
    0,
  );

  TestValidator.equals(
    "comment initial downvote count is 0",
    comment.downvote_count,
    0,
  );

  TestValidator.equals(
    "comment initial child comment count is 0",
    comment.child_comment_count,
    0,
  );
}
