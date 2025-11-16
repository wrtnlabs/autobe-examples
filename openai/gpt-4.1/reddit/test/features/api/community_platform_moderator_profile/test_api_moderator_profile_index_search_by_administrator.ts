import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModeratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModeratorProfile";

/**
 * Validate that an administrator can search, filter, and paginate moderator
 * profiles for a specific moderator via PATCH
 * /communityPlatform/administrator/moderators/{moderatorId}/profiles.
 *
 * Steps:
 *
 * 1. Register and authenticate administrator using POST /auth/administrator/join
 *    (api.functional.auth.administrator.join).
 * 2. Generate a test moderatorId (UUID) for use in search (as moderator creation
 *    is not exposed for test).
 * 3. Prepare a search request body (ICommunityPlatformModeratorProfile.IRequest),
 *    varying filters (page, limit, partial display_username, status, creation
 *    date range).
 * 4. Issue PATCH
 *    /communityPlatform/administrator/moderators/{moderatorId}/profiles as
 *    admin, verify that:
 *
 *    - Returned data matches IPageICommunityPlatformModeratorProfile.ISummary.
 *    - Pagination (pagination property) has valid current, limit, records, and pages
 *         fields.
 *    - Profiles in data[] have display_username, status, created_at, moderator.
 *    - Each moderator field matches ICommunityPlatformModerator.ISummary (id is
 *         valid UUID).
 * 5. Validate core filtering: if a display_username is given, at least one
 *    returned profile (if present) must include that substring. If status is
 *    set, returned profiles should have matching status. If creation date
 *    window given, profile created_at values should be inside the window.
 * 6. Validate that zero-result filtering returns an empty data[] and correct
 *    pagination.
 */
export async function test_api_moderator_profile_index_search_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate administrator
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_status: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Generate test moderatorId
  const moderatorId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare profile search request body
  const displayUser = RandomGenerator.name(1); // partial match
  const filterStatus = RandomGenerator.pick([
    "visible",
    "hidden",
    "flagged",
  ] as const);
  const now = new Date();
  const fromDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // within last week
  const toDate = now.toISOString();
  const reqBody = {
    page: 1,
    limit: 10,
    display_username: displayUser,
    status: filterStatus,
    created_from: fromDate,
    created_to: toDate,
  } satisfies ICommunityPlatformModeratorProfile.IRequest;

  // 4. Call PATCH /communityPlatform/administrator/moderators/{moderatorId}/profiles
  const result =
    await api.functional.communityPlatform.administrator.moderators.profiles.index(
      connection,
      {
        moderatorId: moderatorId,
        body: reqBody,
      },
    );
  typia.assert(result);

  // 5. Validate pagination fields
  const pageInfo = result.pagination;
  TestValidator.predicate(
    "pagination.current is number >= 0",
    pageInfo.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is number >= 0",
    pageInfo.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is number >= 0",
    pageInfo.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is number >= 0",
    pageInfo.pages >= 0,
  );

  // 6. Validate each profile
  for (const item of result.data) {
    // Profile fields present
    TestValidator.predicate(
      "profile.display_username is string",
      typeof item.display_username === "string",
    );
    TestValidator.predicate(
      "profile.status present",
      typeof item.status === "string",
    );
    TestValidator.predicate(
      "profile.created_at valid",
      typeof item.created_at === "string" && !!Date.parse(item.created_at),
    );
    // Moderator reference
    TestValidator.predicate(
      "profile.moderator.id is valid UUID",
      typeof item.moderator.id === "string" &&
        /^[0-9a-f-]{36}$/i.test(item.moderator.id),
    );
    // If filtering by display_username, one of profiles must match partial
    if (displayUser) {
      TestValidator.predicate(
        "at least one profile matches display_username partial",
        result.data.some((d) => d.display_username.includes(displayUser)),
      );
    }
    // If status filter set, profile must have that status
    if (filterStatus) {
      TestValidator.predicate(
        "profile status matches filter",
        item.status === filterStatus,
      );
    }
    // If filtering by date range, created_at inside window
    TestValidator.predicate(
      "profile.created_at within range",
      (!reqBody.created_from || item.created_at >= reqBody.created_from) &&
        (!reqBody.created_to || item.created_at <= reqBody.created_to),
    );
  }

  // 7. Zero-result edge case: try an impossible filter
  const zeroFilterReqBody = {
    ...reqBody,
    display_username: "nonexistent-user-xyzzy",
    status: "hidden",
  } satisfies ICommunityPlatformModeratorProfile.IRequest;
  const zeroResult =
    await api.functional.communityPlatform.administrator.moderators.profiles.index(
      connection,
      {
        moderatorId: moderatorId,
        body: zeroFilterReqBody,
      },
    );
  typia.assert(zeroResult);
  TestValidator.equals(
    "zero-result filtering gives empty data[]",
    zeroResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current matches",
    zeroResult.pagination.current,
    reqBody.page,
  );
  TestValidator.equals(
    "pagination limit matches",
    zeroResult.pagination.limit,
    reqBody.limit,
  );
}
