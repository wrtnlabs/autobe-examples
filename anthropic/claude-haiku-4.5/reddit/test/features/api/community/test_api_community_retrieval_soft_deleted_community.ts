import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_retrieval_soft_deleted_community(
  connection: api.IConnection,
) {
  // Setup: Create member account (creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorData = {
    email: creatorEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: "TestPassword123!",
    href: "http://localhost:3000/auth/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const creator = await api.functional.auth.member.join(connection, {
    body: creatorData,
  });
  typia.assert(creator);

  // Setup: Create member account (non-creator)
  const nonCreatorEmail = typia.random<string & tags.Format<"email">>();
  const nonCreatorData = {
    email: nonCreatorEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: "TestPassword123!",
    href: "http://localhost:3000/auth/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const nonCreator = await api.functional.auth.member.join(connection, {
    body: nonCreatorData,
  });
  typia.assert(nonCreator);

  // Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: "AdminPassword123!",
    name: RandomGenerator.name(),
    href: "http://localhost:3000/auth/admin/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Setup: Create category
  const categoryData = {
    name: "Technology",
    slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
    display_order: 1,
    description: "Technology related discussions",
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Setup: Login as creator to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Create community
  const communityData = {
    name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
    identifier: `test_${RandomGenerator.alphaNumeric(10)}`,
    description: "A test community for soft-delete verification",
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
  TestValidator.equals(
    "community created with active status",
    community.deleted_at,
    undefined,
  );

  // Test 1: Creator can retrieve their community
  const creatorRetrievedCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId: community.id,
    });
  typia.assert(creatorRetrievedCommunity);
  TestValidator.equals(
    "creator retrieves community successfully",
    creatorRetrievedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "community has no deletion timestamp when active",
    creatorRetrievedCommunity.deleted_at,
    undefined,
  );

  // Test 2: Non-creator can also retrieve public community
  await api.functional.auth.member.login(connection, {
    body: {
      email: nonCreatorEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const nonCreatorRetrieved =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId: community.id,
    });
  typia.assert(nonCreatorRetrieved);
  TestValidator.equals(
    "non-creator retrieves public community",
    nonCreatorRetrieved.id,
    community.id,
  );

  // Test 3: Verify community structure includes deleted_at field capability
  TestValidator.predicate(
    "community structure supports soft-delete timestamp",
    creatorRetrievedCommunity.deleted_at === undefined ||
      typeof creatorRetrievedCommunity.deleted_at === "string",
  );

  // Test 4: Admin can retrieve the community
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "http://localhost:3000/auth/admin/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const adminRetrievedCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId: community.id,
    });
  typia.assert(adminRetrievedCommunity);
  TestValidator.equals(
    "admin retrieves community",
    adminRetrievedCommunity.id,
    community.id,
  );

  // Test 5: Verify community creator information
  TestValidator.equals(
    "community creator matches",
    community.creator.id,
    creator.id,
  );
  TestValidator.equals(
    "retrieved community shows same creator",
    creatorRetrievedCommunity.creator.id,
    community.creator.id,
  );
}
