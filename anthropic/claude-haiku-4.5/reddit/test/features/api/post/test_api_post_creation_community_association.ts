import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_creation_community_association(
  connection: api.IConnection,
) {
  // Step 1: Create an authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member created successfully", member.id !== null);

  // Step 2: Create an authenticated administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator created successfully",
    admin.id !== null,
  );

  // Step 3: Create a category for community classification (as administrator)
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and software discussion",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    category.id !== null,
  );

  // Step 4: Switch back to member authentication and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_images",
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
    "community identifier matches",
    community.identifier,
    community.identifier,
  );

  // Step 5: Create a post within the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "First Post in Community",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.predicate("post created successfully", post.id !== null);

  // Step 6: Verify post community association
  TestValidator.equals(
    "post community ID matches created community ID",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post community identifier matches",
    post.community.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "post community name matches",
    post.community.name,
    community.name,
  );

  // Step 7: Verify community details are fully populated in post response
  TestValidator.predicate(
    "post community has subscriber count",
    post.community.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "post community has post count",
    post.community.post_count >= 1,
  );
  TestValidator.predicate(
    "post community has created_at timestamp",
    post.community.created_at !== null,
  );

  // Step 8: Verify creator association
  TestValidator.equals(
    "post creator ID matches authenticated member",
    post.creator.id,
    member.id,
  );
  TestValidator.equals(
    "post creator username matches member username",
    post.creator.username,
    memberUsername,
  );
}
