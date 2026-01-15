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
export async function test_api_admin_report_status_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account using join operation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  // Step 2: Use member connection to submit report against another member
  const targetMemberEmail = typia.random<string & tags.Format<"email">>();
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(targetMemberConnection, {
      body: {
        email: targetMemberEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      },
    });
  // Submit report from member to target member
  const report: ICommunityPlatformReportOfMember =
    await generate_random_community_platform_member_report_of_members_create(
      memberConnection,
      {
        body: {
          target_member_id: targetMember.id,
          reason: "harassment",
        } satisfies ICommunityPlatformReportOfMember.ICreate,
      },
    );
  // Step 3: Create admin account using join operation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin",
    ip: null,
  };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminData },
  );
  // Step 4: Update report status from 'pending' to 'accepted' using admin connection
  const updatedReport: ICommunityPlatformReportOfMember =
    await api.functional.communityPlatform.admin.report.of.members.update(
      adminConnection,
      {
        logId: report.id,
        body: {
          status: "accepted",
        } satisfies ICommunityPlatformReportOfMember.IUpdate,
      },
    );
  // Step 5: Validate the report status was successfully updated
  typia.assert(updatedReport);
  TestValidator.equals(
    "report status should be updated to 'accepted'",
    updatedReport.status,
    "accepted",
  );
}
