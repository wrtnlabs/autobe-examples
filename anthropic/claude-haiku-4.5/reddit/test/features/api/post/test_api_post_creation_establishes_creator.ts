import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_creation_establishes_creator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and category
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Switch to admin connection for category creation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${admin.token.access}`,
    },
  };

  const categoryData = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph(),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 2: Create first member who will create the community
  const memberData1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.alphabets(10),
    ip: "127.0.0.1",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member1 = await api.functional.auth.member.join(connection, {
    body: memberData1,
  });
  typia.assert(member1);

  // Create connection for member1
  const member1Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${member1.token.access}`,
    },
  };

  // Step 3: Member1 creates a community
  const communityData = {
    name: RandomGenerator.name(),
    identifier: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph(),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      member1Connection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 4: Create second member who will create the post
  const memberData2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.alphabets(10),
    ip: "127.0.0.1",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member2 = await api.functional.auth.member.join(connection, {
    body: memberData2,
  });
  typia.assert(member2);

  // Create connection for member2
  const member2Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${member2.token.access}`,
    },
  };

  // Step 5: Member2 creates a post in the community
  const postData = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.name(3),
    content_text: RandomGenerator.paragraph({ sentences: 5 }),
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    member2Connection,
    { body: postData },
  );
  typia.assert(post);

  // Step 6: Validate that the post creator matches member2's information
  TestValidator.equals(
    "post creator ID matches authenticated member",
    post.creator.id,
    member2.id,
  );

  TestValidator.equals(
    "post creator username matches authenticated member",
    post.creator.username,
    memberData2.username,
  );

  TestValidator.equals(
    "post creator email matches authenticated member",
    post.creator.email,
    memberData2.email,
  );

  // Verify creator information is populated
  TestValidator.predicate(
    "creator karma_score is non-negative",
    post.creator.karma_score >= 0,
  );

  TestValidator.predicate(
    "creator account_status is active",
    post.creator.account_status === "active",
  );

  TestValidator.predicate(
    "creator email_verified field exists",
    typeof post.creator.email_verified === "boolean",
  );

  // Verify community association
  TestValidator.equals(
    "post community ID matches target community",
    post.community.id,
    community.id,
  );

  TestValidator.predicate(
    "post visibility is public",
    post.visibility_status === "public",
  );

  TestValidator.predicate(
    "post title matches input",
    post.title === postData.title,
  );

  TestValidator.predicate(
    "post content matches input",
    post.content_text === postData.content_text,
  );

  TestValidator.predicate(
    "post initial vote score is zero",
    post.vote_score === 0,
  );

  TestValidator.predicate(
    "post initial comment count is zero",
    post.comment_count === 0,
  );
}
