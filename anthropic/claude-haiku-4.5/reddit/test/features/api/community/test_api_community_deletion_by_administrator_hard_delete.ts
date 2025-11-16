import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_deletion_by_administrator_hard_delete(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123!";
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator account created",
    administrator.id !== undefined,
  );

  // Step 2: Member creates account and authenticates
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";
  const memberConnection: api.IConnection = { ...connection, headers: {} };
  const member = await api.functional.auth.member.join(memberConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: memberPassword,
      href: "https://example.com/member",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate("member account created", member.id !== undefined);

  // Step 3: Administrator creates a category
  const adminConnection: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.administrator.login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const categorySlug = `cat_${RandomGenerator.alphaNumeric(6)}`;
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: categorySlug,
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate("category created", category.id !== undefined);

  // Step 4: Member creates a community
  const communityIdentifier = `comm_${RandomGenerator.alphaNumeric(6)}`;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: communityIdentifier,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate("community created", community.id !== undefined);
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.predicate(
    "community not deleted initially",
    community.deleted_at === null || community.deleted_at === undefined,
  );

  // Step 5: Administrator performs hard deletion of community
  const deletedCommunity =
    await api.functional.communityPlatform.administrator.communities.erase(
      adminConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);

  // Step 6: Verify the community is marked as deleted
  TestValidator.equals(
    "deleted community ID matches",
    deletedCommunity.id,
    community.id,
  );
  TestValidator.predicate(
    "community marked as deleted",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );

  // Step 7: Verify audit trail - community should be in deleted state
  TestValidator.equals(
    "deleted community identifier preserved",
    deletedCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.predicate(
    "community metadata preserved post-deletion",
    deletedCommunity.name !== undefined,
  );

  // Step 8: Verify the deletion is recorded
  TestValidator.predicate(
    "deletion timestamp present",
    deletedCommunity.deleted_at !== undefined &&
      deletedCommunity.deleted_at !== null,
  );
  TestValidator.predicate(
    "updated timestamp reflects deletion",
    deletedCommunity.updated_at !== undefined,
  );
}
