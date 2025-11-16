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

export async function test_api_comment_creation_on_post_by_member(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: memberPassword,
    href: "http://localhost:3000/auth/register",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);
  TestValidator.predicate("member created successfully", member.id !== null);

  // 2. Create an administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/auth/admin",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Switch to admin for category creation
  const adminConnection = { ...connection };
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = admin.token.access;

  // 3. Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology discussion and news",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    category.id !== null,
  );

  // Switch back to member for community creation
  const memberConnection = { ...connection };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = member.token.access;

  // 4. Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: `Community ${RandomGenerator.name()}`,
          identifier: `comm_${RandomGenerator.alphaNumeric(6)}`,
          description: "A test community for discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== null,
  );
  TestValidator.equals(
    "community creator matches member",
    community.creator.id,
    member.id,
  );

  // 5. Create a post in the community
  const postContent = RandomGenerator.paragraph({ sentences: 5 });
  const post = await api.functional.communityPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Post ${RandomGenerator.name()}`,
        content_text: postContent,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.predicate("post created successfully", post.id !== null);
  TestValidator.equals(
    "post creator matches member",
    post.creator.id,
    member.id,
  );
  TestValidator.equals(
    "post initially has zero comments",
    post.comment_count,
    0,
  );

  // 6. Create a top-level comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment = await api.functional.communityPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        content: commentContent,
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 7. Validate comment properties
  TestValidator.predicate("comment created successfully", comment.id !== null);
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment assigned to correct post",
    comment.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment has zero upvotes initially",
    comment.upvote_count,
    0,
  );
  TestValidator.equals(
    "comment has zero downvotes initially",
    comment.downvote_count,
    0,
  );
  TestValidator.equals(
    "comment has zero vote score initially",
    comment.vote_score,
    0,
  );
  TestValidator.equals(
    "comment is top-level (nesting_depth 0)",
    comment.nesting_depth,
    0,
  );
  TestValidator.equals(
    "comment is visible",
    comment.visibility_status,
    "visible",
  );
  TestValidator.equals(
    "comment creator matches authenticated member",
    comment.creator.id,
    member.id,
  );
  TestValidator.predicate("comment not locked initially", !comment.is_locked);
  TestValidator.equals(
    "comment has zero child comments",
    comment.child_comment_count,
    0,
  );
  TestValidator.predicate(
    "comment has valid creation timestamp",
    comment.created_at !== null,
  );
}
