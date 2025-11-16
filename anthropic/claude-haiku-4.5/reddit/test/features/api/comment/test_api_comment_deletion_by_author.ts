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

export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";
  const memberHref = "http://localhost:3000/register";
  const memberReferrer = "http://localhost:3000";

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member created successfully",
    memberAuth.id !== null,
  );

  // Step 2: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminUsername = RandomGenerator.alphabets(10);

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: adminUsername,
      name: RandomGenerator.name(),
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);
  TestValidator.predicate("admin created successfully", adminAuth.id !== null);

  // Step 3: Create a category
  const category =
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
  TestValidator.predicate(
    "category created successfully",
    category.id !== null,
  );

  // Step 4: Login as member and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== null,
  );

  // Step 5: Create a post within the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.predicate("post created successfully", post.id !== null);

  // Step 6: Create a top-level comment on the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.predicate("comment created successfully", comment.id !== null);
  TestValidator.equals(
    "comment visibility status is visible",
    comment.visibility_status,
    "visible",
  );
  TestValidator.predicate(
    "comment deleted_at is null initially",
    comment.deleted_at === null || comment.deleted_at === undefined,
  );

  // Step 7: Delete the comment as the creator
  const deletedComment =
    await api.functional.communityPlatform.member.comments.erase(connection, {
      commentId: comment.id,
    });
  typia.assert(deletedComment);

  // Validate deletion results
  TestValidator.equals(
    "deleted comment ID matches original",
    deletedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment visibility status is deleted",
    deletedComment.visibility_status,
    "deleted",
  );
  TestValidator.predicate(
    "deleted_at timestamp is populated",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is a valid ISO datetime",
    typeof deletedComment.deleted_at === "string" &&
      deletedComment.deleted_at.includes("T"),
  );
}
