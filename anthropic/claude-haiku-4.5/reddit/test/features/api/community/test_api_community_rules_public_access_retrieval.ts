import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";

export async function test_api_community_rules_public_access_retrieval(
  connection: api.IConnection,
) {
  // 1. Administrator creates a category for community assignment
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Member authenticates and creates a community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: "SecurePassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "private",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create an unauthenticated connection to test public access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 4. Access community rules without authentication
  const rulesResponse =
    await api.functional.communityPlatform.communities.rules.index(
      unauthConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityRule.IRequest,
      },
    );
  typia.assert(rulesResponse);

  // 5. Validate that rules are publicly accessible and contain expected structure
  TestValidator.predicate(
    "rules response should have pagination info",
    rulesResponse.pagination !== null && rulesResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "rules data should be an array",
    Array.isArray(rulesResponse.data),
  );

  // Validate pagination structure
  if (rulesResponse.data.length > 0) {
    TestValidator.predicate(
      "first rule should have valid id",
      rulesResponse.data[0].id !== null &&
        rulesResponse.data[0].id !== undefined,
    );

    TestValidator.predicate(
      "first rule should have title",
      rulesResponse.data[0].title !== null &&
        rulesResponse.data[0].title !== undefined,
    );

    TestValidator.predicate(
      "first rule should have description",
      rulesResponse.data[0].description !== null &&
        rulesResponse.data[0].description !== undefined,
    );

    TestValidator.predicate(
      "first rule should have rule_number",
      rulesResponse.data[0].rule_number !== null &&
        rulesResponse.data[0].rule_number !== undefined,
    );
  }

  // 6. Verify pagination metadata
  TestValidator.predicate(
    "pagination should have valid current page",
    rulesResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination should have positive limit",
    rulesResponse.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination should have non-negative records count",
    rulesResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should have non-negative pages count",
    rulesResponse.pagination.pages >= 0,
  );
}
