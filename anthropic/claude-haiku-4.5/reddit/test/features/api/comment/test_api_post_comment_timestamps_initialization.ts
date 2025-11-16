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

export async function test_api_post_comment_timestamps_initialization(
  connection: api.IConnection,
) {
  // Step 1: Create member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: "Test@1234567",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin@1234567",
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "Test@1234567",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10),
          category_slug: category.slug,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post in community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Capture server time before comment creation (approximate)
  const beforeCreation = new Date();

  // Step 7: Create comment on post
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 8: Capture server time after comment creation
  const afterCreation = new Date();

  // Step 9: Validate timestamp format (ISO 8601 UTC with milliseconds)
  TestValidator.predicate(
    "created_at should be ISO 8601 UTC format with milliseconds",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(comment.created_at),
  );

  TestValidator.predicate(
    "updated_at should be ISO 8601 UTC format with milliseconds",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(comment.updated_at),
  );

  // Step 10: Verify deleted_at is null for newly created visible comment
  TestValidator.equals(
    "deleted_at should be null for newly created visible comment",
    comment.deleted_at,
    null,
  );

  // Step 11: Verify created_at and updated_at are approximately equal
  const createdAtTime = new Date(comment.created_at).getTime();
  const updatedAtTime = new Date(comment.updated_at).getTime();
  const timeDifference = Math.abs(createdAtTime - updatedAtTime);

  TestValidator.predicate(
    "created_at and updated_at should be equal for newly created comment",
    timeDifference <= 100,
  );

  // Step 12: Verify timestamps are within reasonable server processing time
  const createdAtMs = new Date(comment.created_at).getTime();
  const beforeMs = beforeCreation.getTime();
  const afterMs = afterCreation.getTime();

  TestValidator.predicate(
    "created_at should be generated server-side within processing window",
    createdAtMs >= beforeMs && createdAtMs <= afterMs + 5000,
  );

  // Step 13: Verify comment visibility status
  TestValidator.equals(
    "visibility_status should be visible for newly created comment",
    comment.visibility_status,
    "visible",
  );

  // Step 14: Verify nesting depth is 0 for top-level comment
  TestValidator.equals(
    "nesting_depth should be 0 for top-level comment",
    comment.nesting_depth,
    0,
  );
}
