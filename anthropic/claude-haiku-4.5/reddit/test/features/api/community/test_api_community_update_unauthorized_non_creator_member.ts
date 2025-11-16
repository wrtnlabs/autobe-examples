import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_update_unauthorized_non_creator_member(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      username: RandomGenerator.name(1),
      name: RandomGenerator.name(2),
      href: "http://localhost/admin/register",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create category as administrator
  const categoryName = RandomGenerator.name(2);
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/\s+/g, "_"),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create first member (Member A - will be community creator)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      username: RandomGenerator.name(1),
      password: "TestPassword123!",
      href: "http://localhost/register",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberA);

  // 4. Member A creates a community
  const communityName = RandomGenerator.name(2);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          identifier: communityName.toLowerCase().replace(/\s+/g, "_"),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create second member (Member B - NOT a moderator, just regular member)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      username: RandomGenerator.name(1),
      password: "TestPassword123!",
      href: "http://localhost/register",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // 6. Switch to Member B's authentication
  const memberBAuth = await api.functional.auth.member.login(connection, {
    body: {
      email: memberBEmail,
      password: "TestPassword123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(memberBAuth);

  // 7. Attempt to update community settings as Member B (should fail with 403)
  await TestValidator.error(
    "non-creator member cannot update community settings",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        connection,
        {
          communityId: community.id,
          body: {
            name: "Unauthorized Updated Name",
            description: "This update should be rejected",
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );

  // 8. Verify community settings remain unchanged by switching back to Member A
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberAEmail,
      password: "TestPassword123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 9. Verify Member A (creator) can still update the community
  const updatedCommunity =
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityId: community.id,
        body: {
          name: "Updated by Creator",
          description: "This update should succeed",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  TestValidator.equals(
    "community name should be updated by creator",
    updatedCommunity.name,
    "Updated by Creator",
  );
}
