import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserReport";
import { prepare_random_community_bbs_user_report } from "../../../prepare/prepare_random_community_bbs_user_report";
import { generate_random_community_bbs_member_users_reports_create } from "../../../generate/generate_random_community_bbs_member_users_reports_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_user_report_submission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as reporting member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    reporterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(reporter);
  // Step 2: Create a second connection and authenticate as reported member
  const reportedConnection: api.IConnection = { host: connection.host };
  const reportedMember: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(reportedConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    });
  typia.assert(reportedMember);
  // Step 3: Submit a report using the generation function and reporter's connection
  const report: ICommunityBbsUserReport =
    await generate_random_community_bbs_member_users_reports_create(
      reporterConnection,
      {
        body: {
          reported_user_id: reportedMember.id,
          custom_description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
        },
      },
    );
  typia.assert(report);
  // Step 4: Validate report properties
  TestValidator.equals(
    "report status is pending_review",
    report.status,
    "pending_review",
  );
  TestValidator.equals(
    "reported user ID matches",
    report.reported_user_id,
    reportedMember.id,
  );
  TestValidator.predicate(
    "custom description is non-empty",
    report.custom_description.length > 0,
  );
  TestValidator.predicate(
    "violation category ID is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      report.violation_category_id,
    ),
  );
}
