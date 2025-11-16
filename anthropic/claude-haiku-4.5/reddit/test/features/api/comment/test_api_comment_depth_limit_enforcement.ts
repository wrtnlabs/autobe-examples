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

export async function test_api_comment_depth_limit_enforcement(
  connection: api.IConnection,
) {
  // Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Setup: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Setup: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Setup: Create post (serves as root for comment chain)
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Discussion Thread for Depth Testing",
        content_text: "Testing comment nesting depth limits",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Create initial comment (top-level reply to post)
  let currentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "Starting the nested comment chain",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(currentComment);

  // Build nested comment chain up to depth 10
  // Each iteration creates a reply to the previous comment
  for (let i = 0; i < 9; i++) {
    currentComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            parent_comment_id: currentComment.id,
            content: `Nested reply at level ${i + 2}`,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(currentComment);
  }

  // Verify we reached the maximum nesting depth of 10
  TestValidator.equals(
    "comment should reach maximum nesting depth of 10",
    currentComment.nesting_depth,
    10,
  );

  // Attempt to create an 11th level comment - should be rejected
  await TestValidator.error(
    "creating comment beyond maximum depth of 10 should be rejected",
    async () => {
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            parent_comment_id: currentComment.id,
            content: "This comment exceeds the maximum nesting depth limit",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
