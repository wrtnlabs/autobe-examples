import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Validate that a platform admin can search and filter reports by reason
 * category.
 *
 * Business flow (adapted to available APIs):
 *
 * 1. Join as a platform admin to obtain an initial admin session.
 * 2. As admin, create two report reason categories (e.g., spam and harassment).
 * 3. Join as a member user (auto-authenticated).
 * 4. As the member user, create several reports tied to each category.
 * 5. Log back in as the platform admin to ensure admin auth context.
 * 6. Call PATCH /communityPlatform/platformAdmin/search/reports with
 *    reason_category_ids targeting only the spam category and verify that all
 *    returned reports belong to that category and that pagination metadata is
 *    consistent.
 */
export async function test_api_platform_admin_search_reports_by_reason_and_status(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (auto-authenticated)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphabets(12);

  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(2),
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. As admin, create two report reason categories: spam and harassment
  const spamCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: {
          code: `spam_${RandomGenerator.alphaNumeric(8)}`,
          name: "Spam",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_user_visible: true,
          is_active: true,
        } satisfies ICommunityPlatformReportReasonCategory.ICreate,
      },
    );
  typia.assert(spamCategory);

  const harassmentCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: {
          code: `harassment_${RandomGenerator.alphaNumeric(8)}`,
          name: "Harassment",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_user_visible: true,
          is_active: true,
        } satisfies ICommunityPlatformReportReasonCategory.ICreate,
      },
    );
  typia.assert(harassmentCategory);

  // 3. Register a member user (auto-authenticated as member)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphabets(12);

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: memberEmail,
      password: memberPassword,
      href: "https://app.example.com/join",
      referrer: "https://app.example.com/home",
      ip: undefined,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  // 4. As member, create several reports across categories
  const reportsForSpam = await ArrayUtil.asyncRepeat(2, async () => {
    const created =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        {
          body: {
            reporter_type: "member",
            report_reason_category_id: spamCategory.id,
            community_id: null,
            severity: null,
            description: RandomGenerator.paragraph({ sentences: 6 }),
          } satisfies ICommunityPlatformReport.ICreate,
        },
      );
    typia.assert(created);
    return created;
  });

  const reportsForHarassment = await ArrayUtil.asyncRepeat(1, async () => {
    const created =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        {
          body: {
            reporter_type: "member",
            report_reason_category_id: harassmentCategory.id,
            community_id: null,
            severity: null,
            description: RandomGenerator.paragraph({ sentences: 6 }),
          } satisfies ICommunityPlatformReport.ICreate,
        },
      );
    typia.assert(created);
    return created;
  });

  TestValidator.equals(
    "created expected number of test reports",
    reportsForSpam.length + reportsForHarassment.length,
    3,
  );

  // 5. Log back in as platform admin to ensure admin auth context
  const adminLogin = await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
      ip: null,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });
  typia.assert(adminLogin);

  // 6. Search reports filtered by spamCategory.id only
  const pageSize = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchResult =
    await api.functional.communityPlatform.platformAdmin.search.reports.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          pageSize,
          statuses: undefined,
          reporter_types: undefined,
          severity_levels: undefined,
          community_ids: undefined,
          reason_category_ids: [spamCategory.id],
          created_from: null,
          created_to: null,
          resolved_from: null,
          resolved_to: null,
          description_query: null,
          sort_by: null,
          sort_direction: null,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );

  typia.assert(searchResult);

  const pagination = searchResult.pagination;
  TestValidator.predicate(
    "pagination records should be at least number of spam reports created",
    pagination.records >= reportsForSpam.length,
  );

  TestValidator.equals(
    "pagination limit equals requested pageSize",
    pagination.limit,
    pageSize,
  );

  TestValidator.predicate(
    "pagination pages computed consistently",
    pagination.pages === 0 ||
      pagination.pages ===
        Math.ceil(pagination.records / (pagination.limit || 1)),
  );

  // 7. Validate that all returned summaries belong to spamCategory
  for (const summary of searchResult.data) {
    typia.assert(summary);

    TestValidator.equals(
      "summary reasonCategory id matches spam category",
      summary.reasonCategory.id,
      spamCategory.id,
    );

    TestValidator.predicate(
      "summary status is non-empty string",
      summary.status.length > 0,
    );
  }
}
