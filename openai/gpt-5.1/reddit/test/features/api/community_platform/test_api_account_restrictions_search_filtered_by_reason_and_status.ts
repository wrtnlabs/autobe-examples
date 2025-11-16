import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountRestriction";

export async function test_api_account_restrictions_search_filtered_by_reason_and_status(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized adminUser context
  const joinRequestBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin-password-123" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create two restriction episodes with same reason_category but different temporal windows
  const reasonCategory = "spam";
  const now = new Date();

  const activeStartsAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const activeEndsAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const expiredStartsAt = new Date(
    now.getTime() - 20 * 60 * 1000,
  ).toISOString();
  const expiredEndsAt = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

  const createActiveBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: reasonCategory,
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: activeStartsAt as string & tags.Format<"date-time">,
    ends_at: activeEndsAt as string & tags.Format<"date-time">,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const activeRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: createActiveBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(activeRestriction);

  const createExpiredBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: reasonCategory,
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: expiredStartsAt as string & tags.Format<"date-time">,
    ends_at: expiredEndsAt as string & tags.Format<"date-time">,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const expiredRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: createExpiredBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(expiredRestriction);

  // 3. Search only active restrictions by reason_category and temporal window
  const windowFrom = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const windowUntil = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

  const searchActiveBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    subject_username: null,
    subject_type: null,
    restriction_type: null,
    is_active: true,
    effective_from_gte: windowFrom as string & tags.Format<"date-time">,
    effective_from_lte: windowUntil as string & tags.Format<"date-time">,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: reasonCategory,
    created_at_gte: null,
    created_at_lte: null,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const activePage: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.accountRestrictions.index(
      connection,
      {
        body: searchActiveBody,
      },
    );
  typia.assert<IPageICommunityPlatformAccountRestriction.ISummary>(activePage);

  const activeData = activePage.data;

  // 4. Assert that active restriction is present and expired restriction is not
  const containsActive = activeData.some(
    (summary) => summary.id === activeRestriction.id,
  );
  const containsExpired = activeData.some(
    (summary) => summary.id === expiredRestriction.id,
  );

  TestValidator.predicate(
    "active restrictions search should include the active restriction",
    containsActive,
  );

  TestValidator.predicate(
    "active restrictions search should NOT include the expired restriction",
    !containsExpired,
  );

  // 5. Additional assertions on returned summaries
  const nowIso = now.toISOString();

  await ArrayUtil.asyncForEach(activeData, async (summary) => {
    TestValidator.equals(
      "every returned restriction must be active",
      summary.status,
      "active",
    );

    TestValidator.equals(
      "created_by_adminuser.id must match joined admin id",
      summary.created_by_adminuser.id,
      adminAuthorized.id,
    );

    TestValidator.predicate(
      "started_at must be earlier than or equal to now",
      summary.started_at <= (nowIso as string & tags.Format<"date-time">),
    );

    if (summary.ends_at !== null && summary.ends_at !== undefined) {
      TestValidator.predicate(
        "ends_at must be later than or equal to now for active restrictions",
        summary.ends_at >= (nowIso as string & tags.Format<"date-time">),
      );
    }
  });

  // 6. Optional: search for inactive restrictions and confirm expired appears
  const searchInactiveBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    subject_username: null,
    subject_type: null,
    restriction_type: null,
    is_active: false,
    effective_from_gte: windowFrom as string & tags.Format<"date-time">,
    effective_from_lte: windowUntil as string & tags.Format<"date-time">,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: reasonCategory,
    created_at_gte: null,
    created_at_lte: null,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const inactivePage: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.accountRestrictions.index(
      connection,
      {
        body: searchInactiveBody,
      },
    );
  typia.assert<IPageICommunityPlatformAccountRestriction.ISummary>(
    inactivePage,
  );

  const inactiveData = inactivePage.data;

  const inactiveContainsExpired = inactiveData.some(
    (summary) => summary.id === expiredRestriction.id,
  );
  const inactiveContainsActive = inactiveData.some(
    (summary) => summary.id === activeRestriction.id,
  );

  TestValidator.predicate(
    "inactive restrictions search should include the expired restriction",
    inactiveContainsExpired,
  );

  TestValidator.predicate(
    "inactive restrictions search should NOT include the active restriction",
    !inactiveContainsActive,
  );
}
