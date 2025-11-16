import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_update_by_administrator_toggle_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(10);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: adminUsername,
        name: RandomGenerator.name(),
        href: "https://admin.example.com/register",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "SecurePassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: "192.168.1.2",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create community with public visibility
  const communityIdentifier = RandomGenerator.alphabets(8).toLowerCase();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: communityIdentifier,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "initial community visibility is public",
    community.visibility,
    "public",
  );

  // Step 5: Authenticate as administrator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "SecurePassword123!",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 6: Update community to private visibility
  const updatedToPrivate: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: {
          visibility: "private",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedToPrivate);
  TestValidator.equals(
    "community visibility changed to private",
    updatedToPrivate.visibility,
    "private",
  );
  TestValidator.equals(
    "community name unchanged after visibility update",
    updatedToPrivate.name,
    community.name,
  );
  TestValidator.equals(
    "community identifier unchanged after visibility update",
    updatedToPrivate.identifier,
    community.identifier,
  );

  // Step 7: Update community back to public visibility
  const updatedToPublic: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: {
          visibility: "public",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedToPublic);
  TestValidator.equals(
    "community visibility changed back to public",
    updatedToPublic.visibility,
    "public",
  );
  TestValidator.equals(
    "community name remains unchanged after returning to public",
    updatedToPublic.name,
    community.name,
  );
  TestValidator.notEquals(
    "updated_at timestamp reflects the changes",
    updatedToPublic.updated_at,
    community.updated_at,
  );
}
