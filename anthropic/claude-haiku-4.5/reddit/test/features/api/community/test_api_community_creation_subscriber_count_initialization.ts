import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_subscriber_count_initialization(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword =
    RandomGenerator.alphabets(8) +
    RandomGenerator.alphabets(1).toUpperCase() +
    "1!";
  const memberResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberResponse);

  // Step 2: Create administrator account for category creation
  const adminResponse = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password:
          RandomGenerator.alphabets(8) +
          RandomGenerator.alphabets(1).toUpperCase() +
          "1!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminResponse);

  // Step 3: Create a category as administrator
  const categoryResponse =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryResponse);

  // Step 4: Switch back to member context by logging in
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Create community and verify subscriber_count is initialized to 1
  const communityResponse =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: RandomGenerator.pick(["public", "private"] as const),
          post_creation_restriction: RandomGenerator.pick([
            "open_to_all",
            "moderators_only",
            "approved_members_only",
            "karma_requirement",
            "account_age_requirement",
          ] as const),
          post_type_restriction: RandomGenerator.pick([
            "all_types",
            "text_only",
            "text_and_images",
            "text_and_links",
            "images_only",
          ] as const),
          category_slug: categoryResponse.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityResponse);

  // Step 6: Verify subscriber_count is exactly 1 (creator's automatic subscription)
  TestValidator.equals(
    "newly created community subscriber_count should be initialized to 1",
    communityResponse.subscriber_count,
    1,
  );

  // Step 7: Verify creator is the authenticated member
  TestValidator.equals(
    "community creator should be the authenticated member",
    communityResponse.creator.id,
    memberResponse.id,
  );

  // Step 8: Verify community has correct initial state
  TestValidator.predicate(
    "community should have initial post and comment counts as 0",
    communityResponse.post_count === 0 && communityResponse.comment_count === 0,
  );
}
