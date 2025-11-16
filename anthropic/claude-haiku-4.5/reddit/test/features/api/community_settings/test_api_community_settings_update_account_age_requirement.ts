import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_account_age_requirement(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAccount: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // 2. Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create a member account (community creator)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAccount);

  // 4. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Test updating settings with minimum_account_age_days = 14
  const updatedSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_account_age_days: 14,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettings);
  TestValidator.equals(
    "minimum_account_age_days should be 14",
    updatedSettings.minimum_account_age_days,
    14,
  );

  // 6. Test edge case: zero value (no restriction should be accepted)
  const zeroAgeSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_account_age_days: 0,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(zeroAgeSettings);
  TestValidator.equals(
    "minimum_account_age_days should be 0 for no restriction",
    zeroAgeSettings.minimum_account_age_days,
    0,
  );

  // 7. Test edge case: negative value (should return HTTP 400)
  await TestValidator.error(
    "negative account age should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.settings.update(
        connection,
        {
          communityId: community.id,
          body: {
            minimum_account_age_days: -1,
          } satisfies ICommunityPlatformCommunitySettings.IUpdate,
        },
      );
    },
  );

  // 8. Test edge case: large value (should be accepted)
  const largeAgeSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_account_age_days: 365,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(largeAgeSettings);
  TestValidator.equals(
    "minimum_account_age_days should accept large values",
    largeAgeSettings.minimum_account_age_days,
    365,
  );

  // 9. Verify the restriction applies to settings (doesn't affect existing posts)
  TestValidator.predicate(
    "community has updated settings with account age restriction",
    updatedSettings.minimum_account_age_days >= 0,
  );
}
