import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Set up dependencies - create category for the test
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: `test_${RandomGenerator.alphaNumeric(8)}`,
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create administrator account for category creation
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });

  // Step 3: Create member account
  const memberBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `member_${RandomGenerator.alphaNumeric(6)}`,
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  await api.functional.auth.member.join(connection, {
    body: memberBody,
  });

  // Step 4: Create unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 5: Attempt to create community without authentication
  // Should return HTTP 401 Unauthorized
  await TestValidator.error(
    "community creation without authentication should fail with 401",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        unauthConn,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 3 }),
            identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 6: Verify authenticated member CAN create community
  const authenticatedMember = await api.functional.auth.member.login(
    connection,
    {
      body: {
        email: memberBody.email,
        password: memberBody.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ILogin,
    },
  );
  typia.assert(authenticatedMember);

  // Verify successful community creation with authentication
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    identifier: `verified_${RandomGenerator.alphaNumeric(8)}`,
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
    "authenticated user can create community",
    community.identifier,
    communityData.identifier,
  );
}
