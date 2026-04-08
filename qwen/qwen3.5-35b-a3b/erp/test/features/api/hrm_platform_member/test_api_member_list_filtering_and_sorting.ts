import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_list_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Use actor-specific connection - no base connection used directly
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate random test data to represent expected members
  const testMembers = ArrayUtil.repeat(20, (index) => {
    const email = `user${index}@example.com`;
    const displayName =
      index % 3 === 0
        ? `Alice ${RandomGenerator.alphabets(3)}`
        : index % 3 === 1
          ? `Bob ${RandomGenerator.alphabets(3)}`
          : `Charlie ${RandomGenerator.alphabets(3)}`;
    const isActive = index % 2 === 0;
    const createdAt = new Date(Date.now() - index * 3600000).toISOString();
    const lastLoginAt = isActive
      ? new Date(Date.now() - index * 1800000).toISOString()
      : undefined;
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      email,
      display_name: displayName,
      is_active: isActive,
      created_at: createdAt,
      updated_at: createdAt,
      last_login_at: lastLoginAt,
    } as IHrmPlatformMember.ISummary;
  });
  // 1. Test email partial match filter (case-insensitive)
  const emailFilterResult = await api.functional.hrmPlatform.members.index(
    adminConnection,
    {
      body: {
        email: "ali",
      } satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(emailFilterResult);
  // Verify results contain emails with "ali" substring (case-insensitive)
  for (const member of emailFilterResult.data) {
    TestValidator.predicate(
      "email contains search term ali",
      member.email.toLowerCase().includes("ali"),
    );
  }
  // 2. Test display_name partial match filter
  const displayNameFilterResult =
    await api.functional.hrmPlatform.members.index(adminConnection, {
      body: {
        display_name: "bob",
      } satisfies IHrmPlatformMember.IRequest,
    });
  typia.assert(displayNameFilterResult);
  // Verify results contain display_name with "bob" substring (case-insensitive)
  for (const member of displayNameFilterResult.data) {
    TestValidator.predicate(
      "display_name contains search term bob",
      (member.display_name || "").toLowerCase().includes("bob"),
    );
  }
  // 3. Test is_active exact match filter
  const isActiveFilterResult = await api.functional.hrmPlatform.members.index(
    adminConnection,
    {
      body: {
        is_active: true,
      } satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(isActiveFilterResult);
  // Verify all returned members are active
  for (const member of isActiveFilterResult.data) {
    TestValidator.predicate(
      "all returned members are active",
      member.is_active === true,
    );
  }
  // 4. Test date range filters
  const baseDate = new Date();
  const twoHoursAgo = new Date(baseDate.getTime() - 2 * 3600000);
  const sixHoursAgo = new Date(baseDate.getTime() - 6 * 3600000);
  const createdAtFilterResult = await api.functional.hrmPlatform.members.index(
    adminConnection,
    {
      body: {
        created_at: {
          gte: twoHoursAgo.toISOString(),
          lt: baseDate.toISOString(),
        },
      } satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(createdAtFilterResult);
  // Verify all returned members are within date range
  for (const member of createdAtFilterResult.data) {
    const memberCreatedAt = new Date(member.created_at);
    TestValidator.predicate(
      "created_at is >= gte boundary",
      memberCreatedAt >= twoHoursAgo,
    );
    TestValidator.predicate(
      "created_at is < lt boundary",
      memberCreatedAt < baseDate,
    );
  }
  // 5. Test sorting by email ascending
  const emailAscSortResult = await api.functional.hrmPlatform.members.index(
    adminConnection,
    {
      body: {
        sortBy: "email",
        sortOrder: "asc",
      } satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(emailAscSortResult);
  // Verify sorting order
  for (let i = 1; i < emailAscSortResult.data.length; i++) {
    const prevEmail = emailAscSortResult.data[i - 1].email;
    const currEmail = emailAscSortResult.data[i].email;
    TestValidator.predicate(
      "email sorted in ascending order",
      prevEmail <= currEmail,
    );
  }
  // 6. Test sorting by created_at descending
  const createdDescSortResult = await api.functional.hrmPlatform.members.index(
    adminConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(createdDescSortResult);
  // Verify sorting order
  for (let i = 1; i < createdDescSortResult.data.length; i++) {
    const prevDate = new Date(createdDescSortResult.data[i - 1].created_at);
    const currDate = new Date(createdDescSortResult.data[i].created_at);
    TestValidator.predicate(
      "created_at sorted in descending order",
      prevDate >= currDate,
    );
  }
  // 7. Test cursor-based pagination with limit
  const limit = 5;
  const firstPage = await api.functional.hrmPlatform.members.index(
    adminConnection,
    {
      body: {
        limit,
      } satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(firstPage);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination limit respects request",
    firstPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "current page starts at 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "data length within limit",
    firstPage.data.length <= limit,
  );
  TestValidator.predicate(
    "total records >= data length",
    firstPage.pagination.records >= firstPage.data.length,
  );
  // 8. Test max limit enforcement (should cap at 100)
  const maxLimitResult = await api.functional.hrmPlatform.members.index(
    adminConnection,
    {
      body: {
        limit: 200,
      } satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "limit is capped at 100 max",
    maxLimitResult.pagination.limit <= 100,
  );
  // 9. Test combined filters and sorting
  const combinedResult = await api.functional.hrmPlatform.members.index(
    adminConnection,
    {
      body: {
        is_active: true,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(combinedResult);
  // Verify active filter applied
  for (const member of combinedResult.data) {
    TestValidator.predicate("active filter applied", member.is_active === true);
  }
  // Verify sorting still applied with filter
  for (let i = 1; i < combinedResult.data.length; i++) {
    const prevDate = new Date(combinedResult.data[i - 1].created_at);
    const currDate = new Date(combinedResult.data[i].created_at);
    TestValidator.predicate(
      "sorting preserved with filters",
      prevDate >= currDate,
    );
  }
  // 10. Test empty result scenario
  const noMatchResult = await api.functional.hrmPlatform.members.index(
    adminConnection,
    {
      body: {
        email: "nonexistentuser123456789",
        limit: 10,
      } satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no results when filter matches nothing",
    noMatchResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination has zero records",
    noMatchResult.pagination.records === 0,
  );
}
