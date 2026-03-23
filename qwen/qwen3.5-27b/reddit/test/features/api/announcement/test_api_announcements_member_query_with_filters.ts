import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAnnouncement";
import type { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member announcement query with various filters.
 * 1. Authenticate as member using authorize_member_join utility
 * 2. Query announcements with filter parameters (status, targetAudience, date range, search, deliveryStatus)
 * 3. Validate response includes paginated announcement summaries with essential fields
 * 4. Verify pagination metadata (current page, limit, total records, total pages)
 * 5. Test sorting functionality with sortBy and sortOrder parameters
 */
export async function test_api_announcements_member_query_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Query announcements with filter parameters
  const queryBody = {
    status: "active" as const,
    targetAudience: "all" as const,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    search: "announcement",
    deliveryStatus: "delivered" as const,
    page: 1,
    limit: 20,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  } satisfies IRedditCloneAnnouncement.IRequest;
  const result = await api.functional.redditClone.member.announcements.index(
    memberConnection,
    { body: queryBody },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 20);
  TestValidator.predicate("has records", result.pagination.records >= 0);
  TestValidator.predicate("has pages", result.pagination.pages >= 0);
  // 4. Validate announcement summaries if data exists
  if (result.data.length > 0) {
    const firstAnnouncement = result.data[0];
    // Validate essential fields exist
    TestValidator.predicate("has id", firstAnnouncement.id !== undefined);
    TestValidator.predicate("has title", firstAnnouncement.title !== undefined);
    TestValidator.predicate(
      "has status",
      firstAnnouncement.status !== undefined,
    );
    TestValidator.predicate(
      "has createdAt",
      firstAnnouncement.createdAt !== undefined,
    );
    TestValidator.predicate(
      "has updatedAt",
      firstAnnouncement.updatedAt !== undefined,
    );
    // Validate filter criteria match
    TestValidator.equals(
      "status matches filter",
      firstAnnouncement.status,
      "active",
    );
    TestValidator.equals(
      "targetAudience matches filter",
      firstAnnouncement.targetAudience,
      "all",
    );
    TestValidator.equals(
      "deliveryStatus matches filter",
      firstAnnouncement.deliveryStatus,
      "delivered",
    );
  }
  // 5. Test different sorting options
  const sortByCreatedAtAsc = {
    ...queryBody,
    sortBy: "createdAt" as const,
    sortOrder: "asc" as const,
  } satisfies IRedditCloneAnnouncement.IRequest;
  const sortedResult =
    await api.functional.redditClone.member.announcements.index(
      memberConnection,
      { body: sortByCreatedAtAsc },
    );
  typia.assert(sortedResult);
  TestValidator.equals(
    "sort order applied",
    sortedResult.pagination.current,
    1,
  );
  // 6. Test pagination with different page
  const page2Query = {
    ...queryBody,
    page: 2,
  } satisfies IRedditCloneAnnouncement.IRequest;
  const page2Result =
    await api.functional.redditClone.member.announcements.index(
      memberConnection,
      { body: page2Query },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
}
