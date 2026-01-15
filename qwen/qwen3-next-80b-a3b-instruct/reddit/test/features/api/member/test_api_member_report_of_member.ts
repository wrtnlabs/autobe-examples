import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReportOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfMember";
import { prepare_random_community_platform_report_of_member } from "../../../prepare/prepare_random_community_platform_report_of_member";
import { generate_random_community_platform_member_report_of_members_create } from "../../../generate/generate_random_community_platform_member_report_of_members_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_report_of_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member 1 (reporter) by joining
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(reporterConnection, {
      body: {
        email: reporterEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(reporter);
  // Step 2: Authenticate as member 2 (target) by joining
  const targetConnection: api.IConnection = { host: connection.host };
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const target: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(targetConnection, {
      body: {
        email: targetEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(target);
  // Step 3: Submit a valid report from reporter to target member
  const report: ICommunityPlatformReportOfMember =
    await generate_random_community_platform_member_report_of_members_create(
      reporterConnection,
      {
        body: {
          target_member_id: target.id,
          reason: "harassment",
        } satisfies ICommunityPlatformReportOfMember.ICreate,
      },
    );
  typia.assert(report);
  // Step 4: Validate the report creation
  TestValidator.equals(
    "report has valid target_member_id",
    report.reported_member_id,
    target.id,
  );
  TestValidator.equals(
    "report has correct reporter_id",
    report.reporter_member_id,
    reporter.id,
  );
  TestValidator.equals(
    "report has correct reason",
    report.reason,
    "harassment",
  );
  TestValidator.equals("report has pending status", report.status, "pending");
  // Step 5: Attempt self-reporting with reporter's own ID (should fail)
  await TestValidator.error("cannot report self", async () => {
    await generate_random_community_platform_member_report_of_members_create(
      reporterConnection,
      {
        body: {
          target_member_id: reporter.id, // attempting to report self
          reason: "spam",
        } satisfies ICommunityPlatformReportOfMember.ICreate,
      },
    );
  });
}
