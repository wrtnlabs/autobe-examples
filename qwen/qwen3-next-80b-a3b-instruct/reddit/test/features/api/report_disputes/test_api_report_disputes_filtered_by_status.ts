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
export async function test_api_report_disputes_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate member to access protected disputes endpoint
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Retrieve the dispute list
  const disputesResponse =
    await api.functional.communityPlatform.member.reports.disputes.index(
      memberConnection,
    );
  typia.assert(disputesResponse);
  // Validate that each dispute in the response has a valid status value from the enum
  const validStatuses = [
    "pending",
    "investigating",
    "resolved",
    "dismissed",
  ] as const;
  for (const dispute of disputesResponse.data) {
    TestValidator.predicate(`dispute status is valid`, () =>
      validStatuses.includes(dispute.status),
    );
  }
  // Validate pagination properties exist and are valid
  const pagination = disputesResponse.pagination;
  TestValidator.predicate(
    "pagination current page is non-negative",
    () => pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    () => pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => pagination.pages >= 0,
  );
}
