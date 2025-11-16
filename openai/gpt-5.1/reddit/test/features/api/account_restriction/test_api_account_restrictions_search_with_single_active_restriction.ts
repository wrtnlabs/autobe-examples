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

export async function test_api_account_restrictions_search_with_single_active_restriction(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authenticated admin context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a single active account restriction episode
  const now = new Date();
  const startsAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour in future

  const createBody = {
    account_type: "memberUser", // matches ISummary.account_type union
    scope: "full",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const createdRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: createBody },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(createdRestriction);

  // 3. Search with is_active=true and small page/limit
  const searchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    subject_username: null,
    subject_type: null,
    restriction_type: null,
    is_active: true,
    effective_from_gte: null,
    effective_from_lte: null,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: null,
    created_at_gte: null,
    created_at_lte: null,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const pageResult: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.accountRestrictions.index(
      connection,
      { body: searchBody },
    );
  typia.assert<IPageICommunityPlatformAccountRestriction.ISummary>(pageResult);

  // 4. Assert pagination metadata for single-record result
  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    searchBody.limit,
  );
  TestValidator.equals("pagination records should be 1", pagination.records, 1);
  TestValidator.equals("pagination pages should be 1", pagination.pages, 1);

  // 5. Assert data array contains exactly one matching summary
  const summaries = pageResult.data;
  TestValidator.equals(
    "restriction list should contain exactly one item",
    summaries.length,
    1,
  );

  const summary: ICommunityPlatformAccountRestriction.ISummary = summaries[0];
  typia.assert<ICommunityPlatformAccountRestriction.ISummary>(summary);

  TestValidator.equals(
    "summary id should match created restriction id",
    summary.id,
    createdRestriction.id,
  );
  TestValidator.equals(
    "summary account_type should match created account_type",
    summary.account_type,
    "memberUser",
  );

  TestValidator.equals(
    "summary status should be active for currently effective restriction",
    summary.status,
    "active",
  );

  // Validate started_at and ends_at are inside the created window in a coarse way
  const summaryStartedAt = new Date(summary.started_at).getTime();
  const summaryEndsAt =
    summary.ends_at !== null && summary.ends_at !== undefined
      ? new Date(summary.ends_at).getTime()
      : null;

  const createdStartsAtMs = new Date(createBody.starts_at).getTime();
  const createdEndsAtMs =
    createBody.ends_at !== null && createBody.ends_at !== undefined
      ? new Date(createBody.ends_at).getTime()
      : null;

  TestValidator.predicate(
    "summary started_at should be on or after created starts_at",
    summaryStartedAt >= createdStartsAtMs,
  );

  if (summaryEndsAt !== null && createdEndsAtMs !== null) {
    TestValidator.predicate(
      "summary ends_at should be on or before created ends_at",
      summaryEndsAt <= createdEndsAtMs,
    );
  }

  // 6. Validate created_by_adminuser is a proper summary and matches creator id
  const createdByAdmin = summary.created_by_adminuser;
  typia.assert<ICommunityPlatformAdminuser.ISummary>(createdByAdmin);

  TestValidator.equals(
    "created_by_adminuser.id should match adminAuthorized.id",
    createdByAdmin.id,
    adminAuthorized.id,
  );
}
