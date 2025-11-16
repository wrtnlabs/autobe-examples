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
 * Validate platform admin audit trail filtering by actor and account status.
 *
 * Business goal: Ensure that a platform administrator can query the security
 * events audit trail with combined filters for actor_type, actor_id, and
 * account_status_id, and that the endpoint returns consistent pagination
 * metadata for both matching and non-matching filter combinations.
 *
 * Scenario steps:
 *
 * 1. Register a platform admin via /auth/platformAdmin/join and rely on the SDK to
 *    attach the Authorization header for subsequent calls.
 * 2. Create an account status via /communityPlatform/platformAdmin/accountStatuses
 *    and capture its id.
 * 3. Perform an auditTrail.index query filtered by:
 *
 *    - Actor_type="platformadmin"
 *    - Actor_id equal to the created admin id
 *    - Account_status_id equal to the created account status id
 *    - Page=1, pageSize=20 Assert that the response is a valid
 *         IPageICommunityPlatformUserSecurityEvent.ISummary and that any
 *         returned summaries reflect the requested actor_type and actor_id.
 * 4. Perform a second auditTrail.index query that is expected to yield an empty
 *    result by using a mismatching actor_type/actor_id combination together
 *    with the same account_status_id. Assert that:
 *
 *    - Pagination.records === 0
 *    - Pagination.pages === 0
 *    - Data.length === 0
 */
export async function test_api_platform_admin_security_event_audit_trail_filtered_by_actor_and_account_status(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (auth.platformAdmin.join)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create an account status (communityPlatform.platformAdmin.accountStatuses.create)
  const statusCreateBody = {
    key: `TEST_STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: "Test Status for Audit Trail Filters",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const status: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert<ICommunityPlatformAccountStatus>(status);

  // 3. Positive-path filtered audit trail query for this admin
  const now = new Date();
  const from = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 24 hours ago

  const positiveRequestBody = {
    actor_type: "platformadmin",
    actor_id: admin.id,
    account_status_id: status.id,
    created_from: from.toISOString() as string & tags.Format<"date-time">,
    created_to: now.toISOString() as string & tags.Format<"date-time">,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  const positivePage: IPageICommunityPlatformUserSecurityEvent.ISummary =
    await api.functional.communityPlatform.platformAdmin.securityEvents.auditTrail.index(
      connection,
      { body: positiveRequestBody },
    );
  typia.assert<IPageICommunityPlatformUserSecurityEvent.ISummary>(positivePage);

  // Basic pagination assertions for the positive query
  const positivePagination: IPage.IPagination = positivePage.pagination;
  TestValidator.equals(
    "positive query - pagination.current should be 1",
    positivePagination.current,
    1,
  );
  TestValidator.equals(
    "positive query - pagination.limit should equal requested pageSize",
    positivePagination.limit,
    20,
  );

  // If any events are returned, validate that actor_type and actor_id match the filter
  if (positivePage.data.length > 0) {
    for (const event of positivePage.data) {
      const summary: ICommunityPlatformUserSecurityEvent.ISummary = event;
      TestValidator.equals(
        "positive query - event.actor_type matches filter",
        summary.actor_type,
        positiveRequestBody.actor_type,
      );
      TestValidator.equals(
        "positive query - event.actor_id matches filter",
        summary.actor_id,
        positiveRequestBody.actor_id,
      );
    }
  }

  // 4. Negative/empty-result query with mismatching actor_type and actor_id
  const negativeRequestBody = {
    actor_type: "memberuser",
    actor_id: RandomGenerator.alphaNumeric(24),
    account_status_id: status.id,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  const negativePage: IPageICommunityPlatformUserSecurityEvent.ISummary =
    await api.functional.communityPlatform.platformAdmin.securityEvents.auditTrail.index(
      connection,
      { body: negativeRequestBody },
    );
  typia.assert<IPageICommunityPlatformUserSecurityEvent.ISummary>(negativePage);

  const negativePagination: IPage.IPagination = negativePage.pagination;

  TestValidator.equals(
    "negative query - records should be 0 when no events match filters",
    negativePagination.records,
    0,
  );
  TestValidator.equals(
    "negative query - pages should be 0 when no events match filters",
    negativePagination.pages,
    0,
  );
  TestValidator.equals(
    "negative query - data array should be empty when no events match filters",
    negativePage.data.length,
    0,
  );
}
