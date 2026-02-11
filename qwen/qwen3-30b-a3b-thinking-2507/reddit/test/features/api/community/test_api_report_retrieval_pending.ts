import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_reports_create } from "../../../generate/generate_random_community_member_reports_create";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_retrieval_pending(
  connection: api.IConnection,
): Promise<void> {
  // Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies ICommunityAdmin.ILogin,
  });
  // Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ICommunityMember.ILogin,
  });
  // Create a report
  const report = await generate_random_community_member_reports_create(
    memberConnection,
    {
      body: {
        reason: typia.random<string & tags.MinLength<5>>(),
      },
    },
  );
  // Retrieve the report as admin
  const retrievedReport = await api.functional.community.admin.reports.at(
    adminConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // Verify the status is 'pending'
  TestValidator.equals(
    "status should be pending",
    retrievedReport.status,
    "pending",
  );
  // Verify the reason has at least 5 characters
  TestValidator.predicate(
    "reason must be at least 5 characters",
    retrievedReport.reason.length >= 5,
  );
  // Verify reporter's display name is present
  TestValidator.predicate(
    "reporter display name should be present",
    Boolean(retrievedReport.reporter.display_name),
  );
}
