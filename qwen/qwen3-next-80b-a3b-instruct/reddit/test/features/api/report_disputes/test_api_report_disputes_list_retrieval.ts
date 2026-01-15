import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDispute";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportDispute";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_report_disputes_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Call the disputes index endpoint using authenticated connection
  const disputes: IPageICommunityPlatformReportDispute.ISummary =
    await api.functional.communityPlatform.member.reports.disputes.index(
      memberConnection,
    );
  // Step 3: Validate response structure and data types
  typia.assert(disputes);
  // Step 4: Validate dispute status values are valid
  if (disputes.data.length > 0) {
    const firstDispute = disputes.data[0];
    TestValidator.predicate(
      "dispute status is valid",
      ["pending", "investigating", "resolved", "dismissed"].includes(
        firstDispute.status,
      ),
    );
  }
  // Step 5: Test unauthorized access - verify authentication requirements are enforced
  // Create unauthenticated connection
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.communityPlatform.member.reports.disputes.index(
      guestConnection,
    );
  });
}
