import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

export async function test_api_platform_admin_filters_moderators_by_creation_date_and_deleted_flag(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://admin-console.example.com/register",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  TestValidator.equals(
    "platform admin email should match join payload",
    admin.email,
    adminJoinBody.email,
  );

  // 2. Create an account status for moderators (dependency satisfaction)
  const statusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active Moderator",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert(createdStatus);

  TestValidator.equals(
    "created status key should match request",
    createdStatus.key,
    statusCreateBody.key,
  );
  TestValidator.equals(
    "created status label should match request",
    createdStatus.label,
    statusCreateBody.label,
  );

  // 3. Baseline search: include_deleted = true, no date filters
  const baselineRequest = {
    page: 0,
    limit: 20,
    include_deleted: true,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;

  const baselinePage: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.index(
      connection,
      { body: baselineRequest },
    );
  typia.assert(baselinePage);

  const baselineData = baselinePage.data;

  // If there are moderators, derive a date window from their created_at values
  if (baselineData.length > 0) {
    let minCreated = baselineData[0].created_at;
    let maxCreated = baselineData[0].created_at;

    for (const summary of baselineData) {
      if (summary.created_at < minCreated) minCreated = summary.created_at;
      if (summary.created_at > maxCreated) maxCreated = summary.created_at;
    }

    // 4. Filter with include_deleted = false within the derived window
    const activeWindowRequest = {
      page: 0,
      limit: 20,
      created_from: minCreated,
      created_to: maxCreated,
      include_deleted: false,
    } satisfies ICommunityPlatformCommunityModerator.IRequest;

    const activeWindowPage: IPageICommunityPlatformCommunityModerator.ISummary =
      await api.functional.communityPlatform.platformAdmin.communityModerators.index(
        connection,
        { body: activeWindowRequest },
      );
    typia.assert(activeWindowPage);

    for (const summary of activeWindowPage.data) {
      TestValidator.predicate(
        "active-window moderator created_at should be within [minCreated, maxCreated]",
        summary.created_at >= minCreated && summary.created_at <= maxCreated,
      );
      TestValidator.equals(
        "active-window moderators should not be deleted when include_deleted is false",
        summary.is_deleted,
        false,
      );
    }

    // 5. Same window, include_deleted = true
    const allWindowRequest = {
      page: 0,
      limit: 20,
      created_from: minCreated,
      created_to: maxCreated,
      include_deleted: true,
    } satisfies ICommunityPlatformCommunityModerator.IRequest;

    const allWindowPage: IPageICommunityPlatformCommunityModerator.ISummary =
      await api.functional.communityPlatform.platformAdmin.communityModerators.index(
        connection,
        { body: allWindowRequest },
      );
    typia.assert(allWindowPage);

    for (const summary of allWindowPage.data) {
      TestValidator.predicate(
        "all-window moderator created_at should be within [minCreated, maxCreated]",
        summary.created_at >= minCreated && summary.created_at <= maxCreated,
      );
    }
  }

  // 6. Optional: future window that should return empty data
  const futureFrom = "2999-01-01T00:00:00.000Z";
  const futureTo = "2999-12-31T23:59:59.999Z";

  const futureRequest = {
    page: 0,
    limit: 10,
    created_from: futureFrom,
    created_to: futureTo,
    include_deleted: true,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;

  const futurePage: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.index(
      connection,
      { body: futureRequest },
    );
  typia.assert(futurePage);

  TestValidator.equals(
    "future-window search should return empty data array",
    futurePage.data.length,
    0,
  );
  TestValidator.equals(
    "future-window pagination.records should be 0",
    futurePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "future-window pagination.pages should be 0",
    futurePage.pagination.pages,
    0,
  );
}
