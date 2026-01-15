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
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportMetadata";
import type { ICommunityPlatformReportTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTracking";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { generate_random_community_platform_admin_reports_create } from "../../../generate/generate_random_community_platform_admin_reports_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
// Define a local interface to access the 'id' property that must exist in the report but is missing from the provided DTO
export interface ICommunityPlatformReportWithId extends ICommunityPlatformReport {
  id: string;
}
export async function test_api_report_tracking_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin-join",
    referrer: "https://example.com/dashboard",
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminData });
  // Step 2: Create two member connections and authorize
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/member1-join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member1Authorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member1Connection, { body: member1Data });
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/member2-join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  await authorize_member_join(member2Connection, { body: member2Data });
  // Step 3: Member1 creates a report
  const reportData: ICommunityPlatformReport.ICreate = {
    event_type: "content_flag",
    severity: "high",
    content_identifier: typia.random<string & tags.Format<"uuid">>(),
    // This is the key: we associate the report with member1 as the reporter
    related_user_id: member1Authorized.id,
    report_description: "Member1 reported inappropriate content",
  } satisfies ICommunityPlatformReport.ICreate;
  // Create the report - the API should return an object with an id
  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.admin.reports.create(
      adminConnection,
      { body: reportData },
    );
  // CAST the object to our extended interface to access the id that must exist
  const createdReportWithId = createdReport as ICommunityPlatformReportWithId;
  const reportId = createdReportWithId.id; // Get the report's id
  // Step 4: Member1 tries to retrieve their own report tracking record
  // Member1 should be allowed to access their own report tracking record
  const member1TrackingRecord: ICommunityPlatformReportTracking =
    await api.functional.communityPlatform.admin.report.tracking.at(
      member1Connection,
      { trackingId: reportId },
    );
  typia.assert(member1TrackingRecord);
  TestValidator.equals(
    "member1 can retrieve own tracking record",
    member1TrackingRecord.reported_by_actor_id,
    member1Authorized.id,
  );
  // Step 5: Member2 tries to access member1's report tracking record
  // Member2 should not be allowed to access member1's report tracking record
  await TestValidator.error(
    "member2 cannot retrieve other member's report tracking record",
    async () => {
      await api.functional.communityPlatform.admin.report.tracking.at(
        member2Connection,
        { trackingId: reportId },
      );
    },
  );
  // Step 6: Admin tries to access member1's report tracking record
  // Admin should be allowed to access any report tracking record
  const adminTrackingRecord: ICommunityPlatformReportTracking =
    await api.functional.communityPlatform.admin.report.tracking.at(
      adminConnection,
      { trackingId: reportId },
    );
  typia.assert(adminTrackingRecord);
  TestValidator.equals(
    "admin can retrieve member's report tracking record",
    adminTrackingRecord.reported_by_actor_id,
    member1Authorized.id,
  );
}
