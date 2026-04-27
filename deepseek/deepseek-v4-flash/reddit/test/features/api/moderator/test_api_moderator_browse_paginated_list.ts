import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test browsing moderator assignments with pagination across communities.
 *
 * Validates the paginated moderator browse endpoint by requesting two consecutive pages without any search or filter criteria. Ensures that the pagination metadata is correctly populated and that each moderator record contains the expected structure including role-specific appointed_by semantics.
 *
 * Special attention is given to verifying that owner roles have null appointed_by values while moderator roles reference the appointing member. The test also confirms that different pages return distinct sets of records.
 *
 * 1. Request the first page of moderator assignments without filters.
 * 2. Validate pagination metadata (current, limit, records, pages).
 * 3. Validate each record's structure: id, role, member, community, appointed_by, created_at.
 * 4. Request the second page with the same limit.
 * 5. Verify the second page returns different records from the first page.
 */
export async function test_api_moderator_browse_paginated_list(
  connection: api.IConnection,
): Promise<void> {
  const limit = 10;
  // 1. First page - no filters
  const page1 = await api.functional.communityPlatform.moderators.index(
    connection,
    {
      body: {
        page: 1,
        limit,
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(page1);
  // 2. Validate pagination metadata
  TestValidator.equals("current page", page1.pagination.current, 1);
  TestValidator.equals("page limit", page1.pagination.limit, limit);
  TestValidator.predicate(
    "records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", page1.pagination.pages >= 0);
  TestValidator.equals(
    "pages calculation",
    page1.pagination.pages,
    page1.pagination.records === 0
      ? 0
      : Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  // 3. Validate each record structure
  for (const record of page1.data) {
    typia.assert(record);
    // Role validation
    TestValidator.predicate(
      "valid role",
      record.role === "owner" || record.role === "moderator",
    );
    // appointed_by: null for owner, non-null for moderator
    if (record.role === "owner") {
      TestValidator.equals(
        "owner appointed_by is null",
        record.appointed_by,
        null,
      );
    } else {
      TestValidator.predicate(
        "moderator has appointed_by",
        record.appointed_by !== null,
      );
    }
    // member and community should exist (soft-deleted excluded)
    TestValidator.predicate("member exists", record.member !== null);
    TestValidator.predicate("community exists", record.community !== null);
    // Verify member is not soft-deleted
    TestValidator.equals("member is active", record.member.deleted_at, null);
    // created_at is a valid date-time
    TestValidator.predicate(
      "has created_at",
      typeof record.created_at === "string",
    );
  }
  // 4. Second page
  const page2 = await api.functional.communityPlatform.moderators.index(
    connection,
    {
      body: {
        page: 2,
        limit,
      } satisfies ICommunityPlatformModerator.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("second page current", page2.pagination.current, 2);
  TestValidator.equals("second page limit", page2.pagination.limit, limit);
  // 5. Verify different results between pages
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = new Set(page1.data.map((r) => r.id));
    const page2HasDifferentIds = page2.data.some((r) => !page1Ids.has(r.id));
    TestValidator.predicate(
      "second page has records not in first page",
      page2HasDifferentIds,
    );
  }
}
