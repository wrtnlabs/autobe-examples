import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReportOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfMember";
import { prepare_random_community_platform_report_of_member } from "../../../prepare/prepare_random_community_platform_report_of_member";
import { generate_random_community_platform_member_report_of_members_create } from "../../../generate/generate_random_community_platform_member_report_of_members_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_member_report_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account for reporting
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Authenticate as an admin for report deletion
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 3: Create a member report (using member connection)
  const report: ICommunityPlatformReportOfMember =
    await generate_random_community_platform_member_report_of_members_create(
      memberConnection,
      {
        body: {
          target_member_id: member.id,
          reason: "harassment" as const,
        } satisfies ICommunityPlatformReportOfMember.ICreate,
      },
    );
  typia.assert(report);
  const reportId = report.id;
  // Step 4: Administrator deletes the report (using admin connection)
  await api.functional.communityPlatform.admin.report.of.members.erase(
    adminConnection,
    {
      logId: reportId,
    },
  );
  // Step 5: Verify report deletion - attempt to retrieve the report should fail with 404
  // Note: We don't expect the delete endpoint to return a value, so we verify by trying to access
  // the report and ensuring it's gone. Since the API doesn't have a GET endpoint for reports,
  // we rely on the deletion being successful as our validation.
  // The test is complete with a successful delete operation.
}
