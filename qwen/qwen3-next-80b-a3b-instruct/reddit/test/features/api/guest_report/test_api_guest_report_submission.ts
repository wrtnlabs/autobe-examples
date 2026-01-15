import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReportOfGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfGuest";
import { prepare_random_community_platform_report_of_guest } from "../../../prepare/prepare_random_community_platform_report_of_guest";
import { generate_random_community_platform_report_of_guests_create } from "../../../generate/generate_random_community_platform_report_of_guests_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_guest_report_submission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Generate guest session data for reporting
  const guestSessionId = typia.random<string & tags.Format<"uuid">>();
  const reportReason: ICommunityPlatformReportOfGuest.ICreate["report_reason"] =
    "spam";
  // Step 3: Create the guest report using the utility function
  const report =
    await generate_random_community_platform_report_of_guests_create(
      memberConnection,
      {
        body: {
          guest_session_id: guestSessionId,
          report_reason: reportReason,
        },
      },
    );
  typia.assert(report);
  // Step 4: Validate report properties
  TestValidator.equals(
    "guest session ID matches",
    report.guest_session_id,
    guestSessionId,
  );
  TestValidator.equals("report reason is spam", report.reason, "spam");
  TestValidator.equals("status is pending", report.status, "pending");
}
