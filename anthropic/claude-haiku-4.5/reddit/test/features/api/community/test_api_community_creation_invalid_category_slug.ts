import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_invalid_category_slug(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "TestPassword123!",
    ip: "127.0.0.1",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorizedMember);

  // Step 2: Attempt to create a community with a non-existent category slug
  // This should fail because the category does not exist
  await TestValidator.error(
    "creating community with non-existent category should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            identifier: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: "nonexistent_category",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
