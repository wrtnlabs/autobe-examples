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

export async function test_api_community_rules_sorting_variations(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminAccount);

  // Step 2: Create category for community
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: `category_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community creation
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "MemberPass123!",
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);

  // Step 4: Create community
  const communityData = {
    name: RandomGenerator.name(2),
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
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

  // Step 5: Test sorting by rule_number ascending
  const sortByRuleNumberAsc =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "rule_number",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByRuleNumberAsc);

  // Verify ascending order by rule_number
  if (sortByRuleNumberAsc.data.length > 1) {
    for (let i = 0; i < sortByRuleNumberAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "rule_number ascending order verification",
        sortByRuleNumberAsc.data[i].rule_number <=
          sortByRuleNumberAsc.data[i + 1].rule_number,
      );
    }
  }

  // Step 6: Test sorting by rule_number descending
  const sortByRuleNumberDesc =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "rule_number",
        order: "desc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByRuleNumberDesc);

  // Verify descending order by rule_number
  if (sortByRuleNumberDesc.data.length > 1) {
    for (let i = 0; i < sortByRuleNumberDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "rule_number descending order verification",
        sortByRuleNumberDesc.data[i].rule_number >=
          sortByRuleNumberDesc.data[i + 1].rule_number,
      );
    }
  }

  // Step 7: Test sorting by created_at ascending
  const sortByCreatedAtAsc =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByCreatedAtAsc);

  // Verify ascending order by created_at
  if (sortByCreatedAtAsc.data.length > 1) {
    for (let i = 0; i < sortByCreatedAtAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "created_at ascending order verification",
        new Date(sortByCreatedAtAsc.data[i].created_at).getTime() <=
          new Date(sortByCreatedAtAsc.data[i + 1].created_at).getTime(),
      );
    }
  }

  // Step 8: Test sorting by created_at descending
  const sortByCreatedAtDesc =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByCreatedAtDesc);

  // Verify descending order by created_at
  if (sortByCreatedAtDesc.data.length > 1) {
    for (let i = 0; i < sortByCreatedAtDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "created_at descending order verification",
        new Date(sortByCreatedAtDesc.data[i].created_at).getTime() >=
          new Date(sortByCreatedAtDesc.data[i + 1].created_at).getTime(),
      );
    }
  }

  // Step 9: Test sorting by updated_at ascending
  const sortByUpdatedAtAsc =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "updated_at",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByUpdatedAtAsc);

  // Verify ascending order by updated_at
  if (sortByUpdatedAtAsc.data.length > 1) {
    for (let i = 0; i < sortByUpdatedAtAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "updated_at ascending order verification",
        new Date(sortByUpdatedAtAsc.data[i].updated_at).getTime() <=
          new Date(sortByUpdatedAtAsc.data[i + 1].updated_at).getTime(),
      );
    }
  }

  // Step 10: Test sorting by updated_at descending
  const sortByUpdatedAtDesc =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        sort_by: "updated_at",
        order: "desc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByUpdatedAtDesc);

  // Verify descending order by updated_at
  if (sortByUpdatedAtDesc.data.length > 1) {
    for (let i = 0; i < sortByUpdatedAtDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "updated_at descending order verification",
        new Date(sortByUpdatedAtDesc.data[i].updated_at).getTime() >=
          new Date(sortByUpdatedAtDesc.data[i + 1].updated_at).getTime(),
      );
    }
  }

  // Step 11: Verify pagination information is present
  TestValidator.predicate(
    "pagination metadata exists",
    sortByRuleNumberAsc.pagination !== undefined &&
      sortByRuleNumberAsc.pagination.current >= 0,
  );
}
