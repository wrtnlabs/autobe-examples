import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSecurityEvent";

/**
 * Validate that a platform administrator can query user security events
 * filtered by actor_type and event_type with correct pagination and sorting.
 *
 * Business goals:
 *
 * - Ensure that only platformAdmin actors (authenticated via
 *   /auth/platformAdmin/join) can access
 *   /communityPlatform/platformAdmin/userSecurityEvents.
 * - Verify that server respects filter fields actor_type and event_type and
 *   returns events whose summaries match those filters.
 * - Validate that pagination metadata (current, limit, records, pages) is
 *   consistent with the request and returned data length.
 * - Validate that sort_by = "created_at" and sort_direction = "desc" result in a
 *   non-increasing sequence of occurred_at values.
 *
 * Steps:
 *
 * 1. Join as a platform admin, obtaining an authorized connection with JWT.
 * 2. Create at least one account status via
 *    /communityPlatform/platformAdmin/accountStatuses to satisfy domain
 *    prerequisites (not strictly required by the main API, but part of scenario
 *    dependencies).
 * 3. Build an ICommunityPlatformUserSecurityEvent.IRequest payload that filters by
 *    a concrete actor_type (e.g., "memberuser") and event_type (e.g.,
 *    "login_success"), with pagination page=1, pageSize=20 and sorting by
 *    created_at desc.
 * 4. Call api.functional.communityPlatform.platformAdmin.userSecurityEvents.index
 *    with this body and assert that the response matches
 *    IPageICommunityPlatformUserSecurityEvent.ISummary.
 * 5. Validate pagination metadata and that all returned summaries (when any) have
 *    matching actor_type and event_type and are sorted by occurred_at
 *    descending.
 * 6. Using an unauthenticated clone of the connection (headers cleared), verify
 *    that calling the same endpoint results in an error, proving that only
 *    platformAdmin actors can access the security event search.
 */
export async function test_api_user_security_events_search_by_actor_and_event_type(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (sets Authorization header on `connection`)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create at least one account status as dependency
  const statusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active status for tests",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const status: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert(status);

  // 3. Build search request payload for security events
  const actorType = "memberuser";
  const eventType = "login_success";

  const requestBody = {
    actor_type: actorType,
    event_type: eventType,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  const pageResult: IPageICommunityPlatformUserSecurityEvent.ISummary =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
      connection,
      { body: requestBody },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination.current matches requested page",
    pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination.limit matches requested pageSize",
    pagination.limit,
    requestBody.pageSize,
  );
  TestValidator.predicate(
    "pagination.records should be >= number of returned items",
    pagination.records >= data.length,
  );

  if (pagination.limit > 0) {
    const expectedPages =
      pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pagination.pages is consistent with records and limit",
      pagination.pages,
      expectedPages,
    );
  }

  // 5. Validate filters and sorting when there are results
  if (data.length > 0) {
    for (const ev of data) {
      // type already asserted by typia, here we focus on business filter logic
      TestValidator.equals(
        "event.actor_type matches requested filter",
        ev.actor_type,
        actorType,
      );
      TestValidator.equals(
        "event.event_type matches requested filter",
        ev.event_type,
        eventType,
      );
      TestValidator.predicate(
        "event.severity_level is a non-empty string",
        typeof ev.severity_level === "string" && ev.severity_level.length > 0,
      );
    }

    // Check descending sort by occurred_at (ISO date-time string)
    for (let i = 0; i + 1 < data.length; i++) {
      const cur = data[i].occurred_at;
      const next = data[i + 1].occurred_at;
      TestValidator.predicate(
        "occurred_at is sorted desc (non-increasing)",
        cur >= next,
      );
    }
  }

  // 6. Ensure that non-admin (unauthenticated) connection cannot access endpoint
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "non-admin or unauthenticated call should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
        unauthConnection,
        { body: requestBody },
      );
    },
  );
}
