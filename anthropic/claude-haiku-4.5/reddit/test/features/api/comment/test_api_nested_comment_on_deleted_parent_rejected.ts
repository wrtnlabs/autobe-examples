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

export async function test_api_nested_comment_on_deleted_parent_rejected(
  connection: api.IConnection,
) {
  // 1. Setup: Authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: "TestPassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // 2. Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 3. Setup: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Setup: Create community (switch back to member context)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech-${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Setup: Create post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Discussion Topic",
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Setup: Create parent comment
  const parentComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "This is the parent comment",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);

  // 7. Verify parent comment is created and visible
  TestValidator.equals(
    "parent comment visibility status is visible",
    parentComment.visibility_status,
    "visible",
  );

  // 8. Create a nested reply to validate normal nested comment creation
  const nestedComment =
    await api.functional.communityPlatform.member.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          post_id: post.id,
          parent_comment_id: parentComment.id,
          content: "This is a nested reply to the parent comment",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(nestedComment);

  // 9. Verify nested comment has correct parent reference
  TestValidator.equals(
    "nested comment references correct parent",
    nestedComment.community_platform_parent_comment_id,
    parentComment.id,
  );

  // 10. Verify nested comment is created in visible state
  TestValidator.equals(
    "nested comment visibility status is visible",
    nestedComment.visibility_status,
    "visible",
  );

  // 11. Verify nesting depth is correctly calculated
  TestValidator.equals(
    "nested comment nesting depth is one level deep",
    nestedComment.nesting_depth,
    1,
  );
}
