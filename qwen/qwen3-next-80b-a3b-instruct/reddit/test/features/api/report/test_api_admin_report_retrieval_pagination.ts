import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostReport";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsReport";
import { prepare_random_community_bbs_post_report } from "../../../prepare/prepare_random_community_bbs_post_report";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_comments_create } from "../../../generate/generate_random_community_bbs_member_comments_create";
import { generate_random_community_bbs_member_post_reports_create } from "../../../generate/generate_random_community_bbs_member_post_reports_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_retrieval_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  // Step 3: Create first post for reporting
  const post1 = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {},
  );
  // Step 4: Submit 26 reports (exceeding default 25 limit) on first post
  // We'll need at least 26 reports to ensure pagination is tested
  for (let i = 0; i < 26; i++) {
    await generate_random_community_bbs_member_post_reports_create(
      memberConnection,
      {
        body: {
          target_post_id: post1.id,
          selected_violation_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies ICommunityBbsPostReport.ICreate,
      },
    );
  }
  // Step 5: Create second post for reporting
  const post2 = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {},
  );
  // Step 6: Submit additional reports on second post to ensure multiple pages exist
  for (let i = 0; i < 15; i++) {
    await generate_random_community_bbs_member_post_reports_create(
      memberConnection,
      {
        body: {
          target_post_id: post2.id,
          selected_violation_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies ICommunityBbsPostReport.ICreate,
      },
    );
  }
  // Step 7: Create additional post reports to ensure sufficient data for pagination testing
  for (let i = 0; i < 10; i++) {
    await generate_random_community_bbs_member_post_reports_create(
      memberConnection,
      {
        body: {
          target_post_id: post1.id,
          selected_violation_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies ICommunityBbsPostReport.ICreate,
      },
    );
  }
  // Step 8: Test pagination with limit=10 (first page)
  const firstPage = await api.functional.communityBbs.admin.users.reports.index(
    adminConnection,
    {
      body: {
        pageLimit: 10,
      } satisfies ICommunityBbsReport.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate first page metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page records > 0",
    () => firstPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "first page pages >= 2",
    () => firstPage.pagination.pages >= 2,
  );
  // Step 9: Test second page using default pagination (no cursor provided)
  const secondPage =
    await api.functional.communityBbs.admin.users.reports.index(
      adminConnection,
      {
        body: {
          pageLimit: 10,
        } satisfies ICommunityBbsReport.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate second page metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.predicate(
    "second page records matches first page",
    () => secondPage.pagination.records === firstPage.pagination.records,
  );
  TestValidator.predicate(
    "second page pages matches first page",
    () => secondPage.pagination.pages === firstPage.pagination.pages,
  );
  // Step 10: Test that we get last page with remaining records
  const thirdPage = await api.functional.communityBbs.admin.users.reports.index(
    adminConnection,
    {
      body: {
        pageLimit: 10,
      } satisfies ICommunityBbsReport.IRequest,
    },
  );
  typia.assert(thirdPage);
  // Validate third page (last page)
  TestValidator.equals("third page current", thirdPage.pagination.current, 3);
  TestValidator.equals("third page limit", thirdPage.pagination.limit, 10);
  TestValidator.predicate(
    "third page records matches total",
    () => thirdPage.pagination.records === firstPage.pagination.records,
  );
  TestValidator.predicate(
    "third page pages matches total",
    () => thirdPage.pagination.pages === firstPage.pagination.pages,
  );
  // Step 11: Verify third page has the correct number of records
  const remainingRecords = firstPage.pagination.records - 10 * 2;
  TestValidator.equals(
    "third page data length",
    thirdPage.data.length,
    remainingRecords > 0 ? remainingRecords : 0,
  );
  // Step 12: Verify all reports are consistent with created data
  const allReports = [...firstPage.data, ...secondPage.data, ...thirdPage.data];
  TestValidator.predicate(
    "all reports total matches records",
    () => allReports.length === firstPage.pagination.records,
  );
  // Step 13: Test empty page when cursor exceeds available data
  const emptyPage =
    await api.functional.communityBbs.admin.users.reports.index(
      adminConnection,
      {
        body: {
          pageLimit: 10,
        } satisfies ICommunityBbsReport.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page current", emptyPage.pagination.current, 4);
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 10);
  TestValidator.equals(
    "empty page records",
    emptyPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "empty page pages",
    emptyPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
}