import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberWarning";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberWarning";

/**
 * Test sorting member warnings by creation date in ascending and descending
 * order.
 *
 * Administrator retrieves warnings sorted from oldest to newest (ascending) and
 * newest to oldest (descending). Validates that default sort order is
 * descending (newest first). Tests sorting with and without filter parameters
 * applied.
 *
 * Test flow:
 *
 * 1. Administrator account setup for warning management
 * 2. Member account creation for authentication
 * 3. Retrieve warnings with ascending sort order (oldest first)
 * 4. Retrieve warnings with descending sort order (newest first)
 * 5. Retrieve warnings with default sort order (validates descending default)
 * 6. Test sorting with member ID filter applied
 * 7. Test sorting with violation category filter applied
 * 8. Test sorting with warning count filter applied
 * 9. Validate pagination works correctly with sorting
 */
export async function test_api_member_warnings_sort_by_creation_date(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "MemberPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Test ascending sort order (oldest first)
  const ascendingResult: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Validate ascending order when multiple records exist
  if (ascendingResult.data.length >= 2) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      TestValidator.predicate(
        `ascending sort: warning ${i} created before or at same time as warning ${i + 1}`,
        new Date(ascendingResult.data[i].createdAt) <=
          new Date(ascendingResult.data[i + 1].createdAt),
      );
    }
  }

  // 4. Test descending sort order (newest first)
  const descendingResult: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Validate descending order when multiple records exist
  if (descendingResult.data.length >= 2) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      TestValidator.predicate(
        `descending sort: warning ${i} created at same time or after warning ${i + 1}`,
        new Date(descendingResult.data[i].createdAt) >=
          new Date(descendingResult.data[i + 1].createdAt),
      );
    }
  }

  // 5. Test default sort order (should be descending - newest first)
  const defaultResult: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(defaultResult);

  // Validate default sort order is descending
  if (defaultResult.data.length >= 2) {
    for (let i = 0; i < defaultResult.data.length - 1; i++) {
      TestValidator.predicate(
        `default sort order is descending: warning ${i} is newer or same age as warning ${i + 1}`,
        new Date(defaultResult.data[i].createdAt) >=
          new Date(defaultResult.data[i + 1].createdAt),
      );
    }
  }

  // 6. Test sorting with member ID filter applied
  const filteredByMember: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          memberId: member.id,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(filteredByMember);

  // Validate filtered ascending sort maintains correct order
  if (filteredByMember.data.length >= 2) {
    for (let i = 0; i < filteredByMember.data.length - 1; i++) {
      TestValidator.predicate(
        `filtered ascending sort: warning ${i} is older or same age as warning ${i + 1}`,
        new Date(filteredByMember.data[i].createdAt) <=
          new Date(filteredByMember.data[i + 1].createdAt),
      );
    }
  }

  // All returned warnings should belong to the filtered member
  for (const warning of filteredByMember.data) {
    TestValidator.equals(
      "filtered warnings belong to the specified member",
      warning.member.id,
      member.id,
    );
  }

  // 7. Test sorting by violation category with descending order
  const filteredByCategory: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          violationCategory: "spam",
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(filteredByCategory);

  // Validate descending sort with category filter
  if (filteredByCategory.data.length >= 2) {
    for (let i = 0; i < filteredByCategory.data.length - 1; i++) {
      TestValidator.predicate(
        `category filtered descending sort: warning ${i} is newer or same as warning ${i + 1}`,
        new Date(filteredByCategory.data[i].createdAt) >=
          new Date(filteredByCategory.data[i + 1].createdAt),
      );
    }
  }

  // 8. Test sorting with warning count minimum filter
  const filteredByCount: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          warningCountMin: 1,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(filteredByCount);

  // Validate ascending sort with count filter
  if (filteredByCount.data.length >= 2) {
    for (let i = 0; i < filteredByCount.data.length - 1; i++) {
      TestValidator.predicate(
        `count filtered ascending sort: warning ${i} is older or same as warning ${i + 1}`,
        new Date(filteredByCount.data[i].createdAt) <=
          new Date(filteredByCount.data[i + 1].createdAt),
      );
    }
  }

  // Verify all returned warnings meet the count minimum
  for (const warning of filteredByCount.data) {
    TestValidator.predicate(
      "warning count is at least minimum threshold",
      warning.warningCount >= 1,
    );
  }

  // 9. Test pagination with sorting (page 1)
  const page1: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(page1);

  // Validate pagination info is correct
  TestValidator.predicate(
    "pagination current page is 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches requested",
    page1.pagination.limit === 5,
  );

  // Validate sorting on first page
  if (page1.data.length >= 2) {
    for (let i = 0; i < page1.data.length - 1; i++) {
      TestValidator.predicate(
        `page 1 descending sort: warning ${i} is newer or same as warning ${i + 1}`,
        new Date(page1.data[i].createdAt) >=
          new Date(page1.data[i + 1].createdAt),
      );
    }
  }
}
