import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_unauthenticated_rejected(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and category as dependency setup
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create unauthenticated connection without authorization token
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Attempt to create community without authentication
  // Should be rejected with 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated request should be rejected with 401",
    401,
    async () => {
      return await api.functional.communityPlatform.member.communities.create(
        unauthenticatedConnection,
        {
          body: {
            name: RandomGenerator.name(2),
            identifier: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph(),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 4: Verify that empty headers indeed represent unauthenticated state
  TestValidator.predicate(
    "unauthenticated connection headers should be empty",
    Object.keys(unauthenticatedConnection.headers || {}).length === 0,
  );
}
