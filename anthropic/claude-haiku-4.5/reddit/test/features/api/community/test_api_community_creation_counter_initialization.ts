import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that newly created communities are initialized with post_count=0 and
 * comment_count=0. Verify that the response includes these counters with
 * correct initial values. Confirm that these counters will be updated as posts
 * and comments are created in the community.
 */
export async function test_api_community_creation_counter_initialization(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateData = {
    email: adminEmail,
    password: RandomGenerator.alphabets(10),
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCreateData,
  });
  typia.assert(admin);

  // Step 2: Create a category for community classification
  const categoryData = {
    name: `Category_${RandomGenerator.alphaNumeric(8)}`,
    slug: `category-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph(),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberCreateData = {
    email: memberEmail,
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    password: RandomGenerator.alphabets(10),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCreateData,
  });
  typia.assert(member);

  // Step 4: Create a new community with the category
  const communityData = {
    name: `Community_${RandomGenerator.alphaNumeric(8)}`,
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph(),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 5: Verify that the created community has post_count=0 and comment_count=0
  TestValidator.equals(
    "post_count should be initialized to 0",
    community.post_count,
    0,
  );
  TestValidator.equals(
    "comment_count should be initialized to 0",
    community.comment_count,
    0,
  );

  // Step 6: Verify that subscriber_count is initialized to 1 (the creator)
  TestValidator.equals(
    "subscriber_count should be 1 (creator is auto-subscribed)",
    community.subscriber_count,
    1,
  );

  // Step 7: Confirm all counter fields are present and correctly typed as numbers
  TestValidator.predicate(
    "post_count is a non-negative integer",
    typeof community.post_count === "number" && community.post_count >= 0,
  );
  TestValidator.predicate(
    "comment_count is a non-negative integer",
    typeof community.comment_count === "number" && community.comment_count >= 0,
  );
  TestValidator.predicate(
    "subscriber_count is a non-negative integer",
    typeof community.subscriber_count === "number" &&
      community.subscriber_count >= 0,
  );

  // Step 8: Verify community metadata is correctly set
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "community identifier matches input",
    community.identifier,
    communityData.identifier,
  );
  TestValidator.equals(
    "community visibility matches input",
    community.visibility,
    communityData.visibility,
  );
  TestValidator.equals(
    "community category slug matches input",
    community.category.slug,
    category.slug,
  );
  TestValidator.equals(
    "community creator matches authenticated member",
    community.creator.id,
    member.id,
  );
}
