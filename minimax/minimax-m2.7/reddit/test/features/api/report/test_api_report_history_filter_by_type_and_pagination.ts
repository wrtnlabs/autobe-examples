import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_history_filter_by_type_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Get initial report history
  const initialReports = await api.functional.redditClone.member.reports.index(
    memberConnection,
    {
      body: {} satisfies IRedditCloneReport.IRequest,
    },
  );
  typia.assert(initialReports);
  // 3. Test filtering by target_type='post'
  const postReports = await api.functional.redditClone.member.reports.index(
    memberConnection,
    {
      body: {
        target_type: "post",
      } satisfies IRedditCloneReport.IRequest,
    },
  );
  typia.assert(postReports);
  // Validate all returned reports have target_type 'post'
  for (const report of postReports.data) {
    TestValidator.equals("target_type is post", report.target_type, "post");
  }
  // For post reports, verify post_title and post_content are populated
  if (postReports.data.length > 0) {
    for (const report of postReports.data) {
      TestValidator.predicate(
        "post_title is defined",
        report.post_title !== undefined,
      );
      TestValidator.predicate(
        "post_content is defined",
        report.post_content !== undefined,
      );
    }
  }
  // 4. Test filtering by target_type='comment'
  const commentReports = await api.functional.redditClone.member.reports.index(
    memberConnection,
    {
      body: {
        target_type: "comment",
      } satisfies IRedditCloneReport.IRequest,
    },
  );
  typia.assert(commentReports);
  // Validate all returned reports have target_type 'comment'
  for (const report of commentReports.data) {
    TestValidator.equals(
      "target_type is comment",
      report.target_type,
      "comment",
    );
  }
  // For comment reports, verify comment_content is populated
  if (commentReports.data.length > 0) {
    for (const report of commentReports.data) {
      TestValidator.predicate(
        "comment_content is defined",
        report.comment_content !== undefined,
      );
    }
  }
  // 5. Test pagination - first page with limit=2
  const firstPageReports =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: {
        limit: 2,
        page: 1,
      } satisfies IRedditCloneReport.IRequest,
    });
  typia.assert(firstPageReports);
  // Validate pagination metadata for first page
  TestValidator.equals(
    "current page is 1",
    firstPageReports.pagination.current,
    1,
  );
  TestValidator.equals("limit is 2", firstPageReports.pagination.limit, 2);
  // 6. Request second page to verify pagination
  const secondPageReports =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: {
        limit: 2,
        page: 2,
      } satisfies IRedditCloneReport.IRequest,
    });
  typia.assert(secondPageReports);
  // Validate pagination metadata for second page
  TestValidator.equals(
    "current page is 2",
    secondPageReports.pagination.current,
    2,
  );
  TestValidator.equals("limit is 2", secondPageReports.pagination.limit, 2);
  // Verify records are consistent across pages
  TestValidator.equals(
    "total records match",
    firstPageReports.pagination.records,
    secondPageReports.pagination.records,
  );
  // 7. Test combined filters: target_type='post' and status='pending'
  const filteredPostReports =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: {
        target_type: "post",
        status: "pending",
      } satisfies IRedditCloneReport.IRequest,
    });
  typia.assert(filteredPostReports);
  // Validate all returned reports match both filters
  for (const report of filteredPostReports.data) {
    TestValidator.equals("target_type is post", report.target_type, "post");
    TestValidator.equals("status is pending", report.status, "pending");
  }
  // 8. Test combined filters: target_type='comment' and status='approved'
  const filteredCommentReports =
    await api.functional.redditClone.member.reports.index(memberConnection, {
      body: {
        target_type: "comment",
        status: "approved",
      } satisfies IRedditCloneReport.IRequest,
    });
  typia.assert(filteredCommentReports);
  // Validate all returned reports match both filters
  for (const report of filteredCommentReports.data) {
    TestValidator.equals(
      "target_type is comment",
      report.target_type,
      "comment",
    );
    TestValidator.equals("status is approved", report.status, "approved");
  }
}
