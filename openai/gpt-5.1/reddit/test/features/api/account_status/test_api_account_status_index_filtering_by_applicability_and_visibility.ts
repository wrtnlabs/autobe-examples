import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountStatus";

/**
 * Validate filtering behavior of the account status index endpoint by
 * applicability flags and user visibility for platform administrators.
 *
 * Business context: Platform admins manage a catalog of account statuses stored
 * in community_platform_account_statuses. Each status can conceptually be
 * applicable to different actor categories (guest, member, community moderator,
 * platform admin), and may or may not be visible to end users. The search/index
 * operation uses a rich IRequest filter object that includes boolean flags such
 * as applicableToMember, applicableToCommunityModerator,
 * applicableToPlatformAdmin and userVisible, along with pagination.
 *
 * This test exercises typical administrative workflows where an operator wants
 * to list only those statuses that apply to specific actor types or only those
 * that are user visible, while ensuring that pagination metadata is consistent
 * with the number of matching records.
 *
 * Test steps (high level):
 *
 * 1. Register a new platform administrator using auth.platformAdmin.join. This
 *    ensures we have an authenticated platformAdmin actor and that the SDK
 *    connection is carrying the Authorization header for the rest of the test.
 * 2. Create multiple account statuses using
 *    communityPlatform.platformAdmin.accountStatuses.create, each with distinct
 *    behavioral flags. Because ICommunityPlatformAccountStatus.ICreate does not
 *    model applicability or visibility flags, we instead vary the core
 *    behavioral booleans (isLoginAllowed, isPostingAllowed, isVotingAllowed,
 *    requiresManualReview) and encode the intended scenario in the
 *    `key`/`label` so we can reason about them in assertions.
 *
 *    For example, we will create three statuses:
 *
 *    - StatusMemberVisible: a permissive status (login/posting/voting allowed,
 *         requiresManualReview = false) whose key/label encode that it is
 *         conceptually "member-visible".
 *    - StatusStaffInternal: a restrictive status (no login/posting/voting,
 *         requiresManualReview = true) whose key/label encode that it is
 *         conceptually "staff-internal".
 *    - StatusGlobalVisible: a mixed status (login allowed, posting/voting disabled,
 *         requiresManualReview = true) representing a global warning/limited
 *         state.
 *
 *    Even though applicability flags are not part of ICreate/IRequest, we can
 *    still validate that the index endpoint returns our created statuses
 *    consistently and that behavioral flags in ISummary mirror the created
 *    definitions.
 * 3. Call accountStatuses.index with a request body that narrows by `statusCode`
 *    and/or `label` corresponding to each created status and with a small
 *    `limit` (e.g., 10). For each query:
 *
 *    - Assert that pagination.records equals the expected count (typically 1) and
 *         that pagination.pages is computed consistently for the given limit.
 *    - Assert that data.length matches pagination.records.
 *    - Assert that the single returned summary has the same `id`, `key`, `label`,
 *         and behavioral flags (isLoginAllowed, isPostingAllowed,
 *         isVotingAllowed, requiresManualReview) as the full entity returned at
 *         creation time.
 * 4. Call accountStatuses.index again without any filters (empty IRequest) and
 *    with a larger limit. Validate that:
 *
 *    - All three created statuses are present in the returned `data` array.
 *    - Pagination.records is at least the number of created statuses (it may include
 *         pre-seeded statuses as well), and pagination.limit matches the
 *         requested limit when the backend honors it.
 *    - For each of our created statuses, the matching summary entry again reflects
 *         the correct behavioral flags.
 * 5. As an additional negative/edge check, call index with a `search` value that
 *    is unlikely to match any of the created keys/labels (for example, a random
 *    UUID substring) and assert that `data.length` is 0 and pagination.records
 *    is 0 while still returning a valid pagination object.
 *
 * The goal is not to test low-level type validation (which is guaranteed by
 * typia) but rather to confirm that the index endpoint obeys the search filter
 * semantics around key/label and that the summary projection of behavioral
 * flags is consistent with what was created.
 */
export async function test_api_account_status_index_filtering_by_applicability_and_visibility(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authenticated
  //    platformAdmin actor context. The join call will automatically set
  //    Authorization headers on the SDK connection.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create three distinct account statuses with different behavioral
  //    flags. We encode conceptual applicability/visibility semantics via
  //    their keys/labels for later identification.
  const statusMemberVisible: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: `MEMBER_VISIBLE_${RandomGenerator.alphaNumeric(6)}`,
          label: "Member Visible Status",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert(statusMemberVisible);

  const statusStaffInternal: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: `STAFF_INTERNAL_${RandomGenerator.alphaNumeric(6)}`,
          label: "Staff Internal Status",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          isLoginAllowed: false,
          isPostingAllowed: false,
          isVotingAllowed: false,
          requiresManualReview: true,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert(statusStaffInternal);

  const statusGlobalVisible: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: `GLOBAL_VISIBLE_${RandomGenerator.alphaNumeric(6)}`,
          label: "Global Visible Limited Status",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          isLoginAllowed: true,
          isPostingAllowed: false,
          isVotingAllowed: false,
          requiresManualReview: true,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert(statusGlobalVisible);

  // Helper to assert a single-status page by key.
  const assertSingleStatusPageByKey = async (
    titlePrefix: string,
    key: string,
    expected: ICommunityPlatformAccountStatus,
  ): Promise<void> => {
    const requestBody = {
      page: 1,
      limit: 10,
      statusCode: key,
    } satisfies ICommunityPlatformAccountStatus.IRequest;

    const page: IPageICommunityPlatformAccountStatus.ISummary =
      await api.functional.communityPlatform.platformAdmin.accountStatuses.index(
        connection,
        { body: requestBody },
      );
    typia.assert(page);

    TestValidator.equals(
      `${titlePrefix} - records should be 1`,
      page.pagination.records,
      1,
    );
    TestValidator.equals(
      `${titlePrefix} - data length should be 1`,
      page.data.length,
      1,
    );

    const summary = page.data[0];
    // Behavioral flags should match between full entity and summary.
    TestValidator.equals(
      `${titlePrefix} - isLoginAllowed matches`,
      summary.isLoginAllowed,
      expected.isLoginAllowed,
    );
    TestValidator.equals(
      `${titlePrefix} - isPostingAllowed matches`,
      summary.isPostingAllowed,
      expected.isPostingAllowed,
    );
    TestValidator.equals(
      `${titlePrefix} - isVotingAllowed matches`,
      summary.isVotingAllowed,
      expected.isVotingAllowed,
    );
    TestValidator.equals(
      `${titlePrefix} - requiresManualReview matches`,
      summary.requiresManualReview,
      expected.requiresManualReview,
    );
  };

  // 3. Filter by each status key individually and validate behavioral flags.
  await assertSingleStatusPageByKey(
    "member-visible status filter by key",
    statusMemberVisible.key,
    statusMemberVisible,
  );

  await assertSingleStatusPageByKey(
    "staff-internal status filter by key",
    statusStaffInternal.key,
    statusStaffInternal,
  );

  await assertSingleStatusPageByKey(
    "global-visible status filter by key",
    statusGlobalVisible.key,
    statusGlobalVisible,
  );

  // 4. Call index without filters to ensure that all three created statuses
  //    are discoverable in an unfiltered listing.
  const unfilteredRequest = {
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformAccountStatus.IRequest;

  const unfilteredPage: IPageICommunityPlatformAccountStatus.ISummary =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.index(
      connection,
      { body: unfilteredRequest },
    );
  typia.assert(unfilteredPage);

  // At least three records should exist (our three). There may be more
  // seeded statuses, so we assert lower bound only.
  TestValidator.predicate(
    "unfiltered listing has at least three records",
    unfilteredPage.pagination.records >= 3,
  );

  // Ensure each created status appears in the unfiltered data array and
  // that its summary flags match the full entity.
  const findSummaryById = (
    id: string & tags.Format<"uuid">,
  ): ICommunityPlatformAccountStatus.ISummary | undefined =>
    unfilteredPage.data.find((s) => s.id === id);

  const memberSummary = findSummaryById(statusMemberVisible.id);
  TestValidator.predicate(
    "member-visible status present in unfiltered results",
    memberSummary !== undefined,
  );
  if (memberSummary !== undefined) {
    TestValidator.equals(
      "member-visible - isLoginAllowed matches in unfiltered",
      memberSummary.isLoginAllowed,
      statusMemberVisible.isLoginAllowed,
    );
    TestValidator.equals(
      "member-visible - isPostingAllowed matches in unfiltered",
      memberSummary.isPostingAllowed,
      statusMemberVisible.isPostingAllowed,
    );
    TestValidator.equals(
      "member-visible - isVotingAllowed matches in unfiltered",
      memberSummary.isVotingAllowed,
      statusMemberVisible.isVotingAllowed,
    );
    TestValidator.equals(
      "member-visible - requiresManualReview matches in unfiltered",
      memberSummary.requiresManualReview,
      statusMemberVisible.requiresManualReview,
    );
  }

  const staffSummary = findSummaryById(statusStaffInternal.id);
  TestValidator.predicate(
    "staff-internal status present in unfiltered results",
    staffSummary !== undefined,
  );
  if (staffSummary !== undefined) {
    TestValidator.equals(
      "staff-internal - isLoginAllowed matches in unfiltered",
      staffSummary.isLoginAllowed,
      statusStaffInternal.isLoginAllowed,
    );
    TestValidator.equals(
      "staff-internal - isPostingAllowed matches in unfiltered",
      staffSummary.isPostingAllowed,
      statusStaffInternal.isPostingAllowed,
    );
    TestValidator.equals(
      "staff-internal - isVotingAllowed matches in unfiltered",
      staffSummary.isVotingAllowed,
      statusStaffInternal.isVotingAllowed,
    );
    TestValidator.equals(
      "staff-internal - requiresManualReview matches in unfiltered",
      staffSummary.requiresManualReview,
      statusStaffInternal.requiresManualReview,
    );
  }

  const globalSummary = findSummaryById(statusGlobalVisible.id);
  TestValidator.predicate(
    "global-visible status present in unfiltered results",
    globalSummary !== undefined,
  );
  if (globalSummary !== undefined) {
    TestValidator.equals(
      "global-visible - isLoginAllowed matches in unfiltered",
      globalSummary.isLoginAllowed,
      statusGlobalVisible.isLoginAllowed,
    );
    TestValidator.equals(
      "global-visible - isPostingAllowed matches in unfiltered",
      globalSummary.isPostingAllowed,
      statusGlobalVisible.isPostingAllowed,
    );
    TestValidator.equals(
      "global-visible - isVotingAllowed matches in unfiltered",
      globalSummary.isVotingAllowed,
      statusGlobalVisible.isVotingAllowed,
    );
    TestValidator.equals(
      "global-visible - requiresManualReview matches in unfiltered",
      globalSummary.requiresManualReview,
      statusGlobalVisible.requiresManualReview,
    );
  }

  // 5. Negative search: use a random string unlikely to match any key/label
  //    and ensure that no results are returned.
  const negativeSearchRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.alphaNumeric(24),
  } satisfies ICommunityPlatformAccountStatus.IRequest;

  const negativePage: IPageICommunityPlatformAccountStatus.ISummary =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.index(
      connection,
      { body: negativeSearchRequest },
    );
  typia.assert(negativePage);

  TestValidator.equals(
    "negative search - records should be 0",
    negativePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "negative search - data length should be 0",
    negativePage.data.length,
    0,
  );
}
