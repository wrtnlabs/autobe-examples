import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_with_invalid_category_slug(
  connection: api.IConnection,
) {
  // 1. Create authenticated member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorizedMember);

  // 2. Attempt to create community with non-existent category_slug
  const invalidCommunityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(15),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: "non_existent_category_slug_12345",
  } satisfies ICommunityPlatformCommunity.ICreate;

  // 3. Verify that creation fails with invalid category
  await TestValidator.error(
    "should reject community creation with invalid category_slug",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: invalidCommunityData,
        },
      );
    },
  );

  // 4. Confirm error handling for invalid category reference
  TestValidator.predicate(
    "authentication token is still valid after error",
    () => connection.headers?.Authorization !== undefined,
  );
}
