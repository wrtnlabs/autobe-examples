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

export async function test_api_platform_admin_searches_moderators_by_identity_and_status(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Create an ACTIVE-like account status for testing
  const accountStatusBody = {
    key: `ACTIVE_FOR_TEST_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active for E2E Test",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Perform an initial broad moderator search (no identity filters)
  const initialRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    include_deleted: true,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;

  const initialPage =
    await api.functional.communityPlatform.platformAdmin.communityModerators.index(
      connection,
      {
        body: initialRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityModerator.ISummary>(initialPage);

  const pagination = initialPage.pagination;
  const moderators = initialPage.data;

  // 3-1. Basic pagination invariants
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    moderators.length <= pagination.limit,
  );

  if (pagination.records === 0) {
    // When no records match, pages must be 0 and data empty
    TestValidator.equals("no records implies zero pages", pagination.pages, 0);
    TestValidator.equals("no records implies empty data", moderators.length, 0);
    return;
  }

  TestValidator.predicate(
    "records > 0 implies at least one page",
    pagination.pages >= 1,
  );

  // 4. Pick a sample moderator as identity/status seed
  const sample: ICommunityPlatformCommunityModerator.ISummary = moderators[0];

  // 4-1. Identity filter by username with include_deleted=true
  const usernameFilterRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    username: sample.username,
    include_deleted: true,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;

  const usernamePage =
    await api.functional.communityPlatform.platformAdmin.communityModerators.index(
      connection,
      {
        body: usernameFilterRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityModerator.ISummary>(
    usernamePage,
  );

  TestValidator.predicate(
    "username-filtered search returns at least one moderator",
    usernamePage.pagination.records > 0,
  );
  TestValidator.predicate(
    "username-filtered data length within limit",
    usernamePage.data.length <= usernamePage.pagination.limit,
  );

  for (const m of usernamePage.data) {
    TestValidator.equals(
      "all username-filtered entries share the same username",
      m.username,
      sample.username,
    );
  }

  // 4-1-bis. Identity filter by email with include_deleted=true
  const emailFilterRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    email: sample.email,
    include_deleted: true,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;

  const emailPage =
    await api.functional.communityPlatform.platformAdmin.communityModerators.index(
      connection,
      {
        body: emailFilterRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityModerator.ISummary>(emailPage);

  TestValidator.predicate(
    "email-filtered data length within limit",
    emailPage.data.length <= emailPage.pagination.limit,
  );

  for (const m of emailPage.data) {
    TestValidator.equals(
      "all email-filtered entries share the same email",
      m.email,
      sample.email,
    );
  }

  // 4-2. Filter by account_status_id (createdStatus) and include_deleted=true
  const statusFilterRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    account_status_id: createdStatus.id,
    include_deleted: true,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;

  const statusPage =
    await api.functional.communityPlatform.platformAdmin.communityModerators.index(
      connection,
      {
        body: statusFilterRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityModerator.ISummary>(statusPage);

  TestValidator.predicate(
    "status-filtered data length within limit",
    statusPage.data.length <= statusPage.pagination.limit,
  );

  for (const m of statusPage.data) {
    TestValidator.equals(
      "all status-filtered entries share requested account_status_id",
      m.account_status.id,
      createdStatus.id,
    );
  }

  // 4-3. Combined filter by username + account_status_id with include_deleted=true
  const combinedFilterRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    username: sample.username,
    account_status_id: sample.account_status.id,
    include_deleted: true,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;

  const combinedPage =
    await api.functional.communityPlatform.platformAdmin.communityModerators.index(
      connection,
      {
        body: combinedFilterRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityModerator.ISummary>(
    combinedPage,
  );

  TestValidator.predicate(
    "combined filters respect limit",
    combinedPage.data.length <= combinedPage.pagination.limit,
  );

  for (const m of combinedPage.data) {
    TestValidator.equals(
      "combined filter username matches",
      m.username,
      sample.username,
    );
    TestValidator.equals(
      "combined filter account_status_id matches",
      m.account_status.id,
      sample.account_status.id,
    );
  }

  // 5. include_deleted semantics: ensure that `include_deleted=false` never returns is_deleted=true
  const nonDeletedFilterRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    username: sample.username,
    account_status_id: sample.account_status.id,
    include_deleted: false,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;

  const nonDeletedPage =
    await api.functional.communityPlatform.platformAdmin.communityModerators.index(
      connection,
      {
        body: nonDeletedFilterRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityModerator.ISummary>(
    nonDeletedPage,
  );

  TestValidator.predicate(
    "non-deleted filter respects limit",
    nonDeletedPage.data.length <= nonDeletedPage.pagination.limit,
  );

  for (const m of nonDeletedPage.data) {
    TestValidator.equals(
      "include_deleted=false excludes logically deleted moderators",
      m.is_deleted,
      false,
    );
  }
}
