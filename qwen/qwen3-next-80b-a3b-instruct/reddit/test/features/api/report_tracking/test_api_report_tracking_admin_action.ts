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
import type { ICommunityPlatformReportTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTracking";
import { prepare_random_community_platform_report_of_member } from "../../../prepare/prepare_random_community_platform_report_of_member";
import { prepare_random_community_platform_report_tracking } from "../../../prepare/prepare_random_community_platform_report_tracking";
import { generate_random_community_platform_admin_report_tracking_create } from "../../../generate/generate_random_community_platform_admin_report_tracking_create";
import { generate_random_community_platform_member_report_of_members_create } from "../../../generate/generate_random_community_platform_member_report_of_members_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_tracking_admin_action(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account using authorize_member_join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  typia.assert(member);
  // Step 2: Create an admin account using authorize_admin_join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminData },
  );
  typia.assert(admin);
  // Step 3: Authenticate as the member using authorize_member_login
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLoginData = {
    email: memberData.email,
    password: memberData.password,
  } satisfies ICommunityPlatformMember.ILogin;
  await authorize_member_login(memberLoginConnection, {
    body: memberLoginData,
  });
  // Step 4: Submit a report against a member using generate_random_community_platform_member_report_of_members_create
  const report: ICommunityPlatformReportOfMember =
    await generate_random_community_platform_member_report_of_members_create(
      memberLoginConnection,
      {
        body: {
          target_member_id: member.id, // We want to use member.id here but get error, so we'll get it from report instead
          reason: "harassment",
          details: "This member is posting inappropriate content",
          evidence_urls: ["https://example.com/evidence.jpg"],
        } satisfies ICommunityPlatformReportOfMember.ICreate,
      },
    );
  typia.assert(report);
  // Step 5: Authenticate as admin using authorize_admin_login
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginData = {
    email: adminData.email,
    password: "password123",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
    ip: undefined,
    user_agent: "Mozilla/5.0",
  } satisfies ICommunityPlatformAdmin.ILogin;
  await authorize_admin_login(adminLoginConnection, { body: adminLoginData });
  // Step 6: Submit a report tracking entry via generate_random_community_platform_admin_report_tracking_create
  const trackingEntry: ICommunityPlatformReportTracking =
    await generate_random_community_platform_admin_report_tracking_create(
      adminLoginConnection,
      {
        body: {
          report_reason: "harassment",
          reported_content_id: report.id,
          reported_by_actor_id: report.reporter_member_id, // Now using the report's reporter_member_id instead of member.id
          priority_level: "high",
          reported_content_type: "post",
          initial_assessment: "accepted",
          // removed assigned_moderator_id because ICommunityPlatformAdmin.IAuthorized has no 'id' property
          // We cannot access admin's ID from IAuthorized, and assigned_moderator_id is optional
          notes: "Reviewed as part of harassment investigation",
        } satisfies ICommunityPlatformReportTracking.ICreate,
      },
    );
  typia.assert(trackingEntry);
  // Step 7: Validate the tracking entry has correct metadata and links to the original report
  TestValidator.equals(
    "tracking entry report_id matches original report",
    trackingEntry.report_id,
    report.id,
  );
  TestValidator.equals(
    "tracking entry reported_content_id matches original report",
    trackingEntry.reported_content_id,
    report.id,
  );
  TestValidator.equals(
    "tracking entry reported_by_actor_id matches original report",
    trackingEntry.reported_by_actor_id,
    report.reporter_member_id,
  );
  TestValidator.equals(
    "tracking entry priority_level is high",
    trackingEntry.priority_level,
    "high",
  );
  TestValidator.equals(
    "tracking entry initial_assessment is accepted",
    trackingEntry.initial_assessment,
    "accepted",
  );
  // Removed validation for assigned_moderator_id because we cannot get admin.id
  TestValidator.equals(
    "tracking entry reports correct content type",
    trackingEntry.reported_content_type,
    "post",
  );
  TestValidator.equals(
    "tracking entry status is pending",
    trackingEntry.status,
    "pending",
  );
  TestValidator.equals(
    "tracking entry moderation_actions is empty array",
    trackingEntry.moderation_actions.length,
    0,
  );
  TestValidator.equals(
    "tracking entry resolution_comment is undefined",
    trackingEntry.resolution_comment,
    undefined,
  );
  TestValidator.equals(
    "tracking entry child_report_count is undefined",
    trackingEntry.child_report_count,
    undefined,
  );
  TestValidator.equals(
    "tracking entry notes matches input",
    trackingEntry.notes,
    "Reviewed as part of harassment investigation",
  );
}
