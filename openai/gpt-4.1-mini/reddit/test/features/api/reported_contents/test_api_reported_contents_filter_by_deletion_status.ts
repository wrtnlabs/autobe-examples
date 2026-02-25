import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_reported_contents_filter_by_deletion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup two actors: admin and user
  const adminConnection: api.IConnection = { host: connection.host };
  // Define fixed password for admin join and login
  const adminPassword = "StrongPassword123!";
  // Admin account creation and login using correct password
  const adminJoin = await authorize_admin_join(adminConnection, { body: { password: adminPassword } });
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: { email: adminJoin.email, password: adminPassword },
  });
  typia.assert(adminLogin);

  const userConnection: api.IConnection = { host: connection.host };
  const userPassword = "UserPassword456!";
  // User account join and login with correct password
  const userJoin = await authorize_user_join(userConnection, { body: { password: userPassword } });
  const userLogin = await authorize_user_login(userConnection, {
    body: { email: userJoin.email, password: userPassword },
  });
  typia.assert(userLogin);

  // 2. User creates a report (a prerequisite to have report and reported contents)
  // We create a typical minimal ICommunityPlatformReport.ICreate object with plausible data
  // Since the DTO type is any, we fill common fields: contentType, contentId, reasonText, description
  const reportDescription = RandomGenerator.paragraph({ sentences: 3 });
  const reportCreateBody: ICommunityPlatformReport.ICreate = {
    contentType: "post",
    contentId: typia.random<string & tags.Format<"uuid">>(),
    reasonText: RandomGenerator.paragraph({ sentences: 2 }),
    description: reportDescription,
  } as any;
  const report = await api.functional.communityPlatform.user.reports.create(
    userConnection,
    {
      body: reportCreateBody,
    },
  );
  typia.assert(report);

  // 3. Fetch with isDeleted true filter using admin connection
  const filteredDeletedContents =
    await api.functional.communityPlatform.admin.reports.reportedContents.index(
      adminConnection,
      {
        reportId: report.id,
        body: {
          isDeleted: true,
          page: 1,
          limit: 100,
          contentType: null,
          createdAfter: null,
          createdBefore: null,
        },
      },
    );
  typia.assert(filteredDeletedContents);

  // 4. Validate that all returned reported contents are indeed soft deleted
  filteredDeletedContents.data.forEach((item) => {
    TestValidator.predicate(
      `reported content soft deleted: ${item.id}`,
      item.deleted_at !== null,
    );
    TestValidator.equals(
      `reported content belongs to report`,
      item.report?.id,
      report.id,
    );
  });

  // 5. Additionally, test that no active (non-deleted) reportedContents appear
  const filteredActiveContents =
    await api.functional.communityPlatform.admin.reports.reportedContents.index(
      adminConnection,
      {
        reportId: report.id,
        body: { isDeleted: false, page: 1, limit: 100 },
      },
    );
  typia.assert(filteredActiveContents);
  filteredActiveContents.data.forEach((item) => {
    TestValidator.predicate(
      `reported content not deleted: ${item.id}`,
      item.deleted_at === null,
    );
    TestValidator.equals(
      `reported content belongs to report`,
      item.report?.id,
      report.id,
    );
  });

  // 6. Test that unauthorized access (no admin auth) fails
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.communityPlatform.admin.reports.reportedContents.index(
      unauthorizedConnection,
      {
        reportId: report.id,
        body: { isDeleted: true, page: 1, limit: 10 },
      },
    );
  });
}
