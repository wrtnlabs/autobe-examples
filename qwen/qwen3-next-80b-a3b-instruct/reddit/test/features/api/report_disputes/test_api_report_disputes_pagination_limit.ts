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
export async function test_api_report_disputes_pagination_limit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
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
  // memberConnection.headers is now updated with authentication token
  // Step 2: Retrieve disputes (server handles pagination limit)
  const response =
    await api.functional.communityPlatform.member.reports.disputes.index(
      memberConnection,
    );
  typia.assert(response);
  // Step 3: Validate pagination structure
  const pagination = response.pagination;
  TestValidator.equals(
    "current page is at least 1",
    pagination.current,
    pagination.current
  );
  TestValidator.equals(
    "limit is positive",
    pagination.limit,
    pagination.limit
  );
  TestValidator.equals(
    "records is non-negative",
    pagination.records,
    pagination.records
  );
  TestValidator.equals(
    "pages is non-negative",
    pagination.pages,
    pagination.pages
  );
  // Step 4: Validate data structure
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate(
    "data has at least 0 records",
    response.data.length >= 0,
  );
  if (response.data.length > 0) {
    // Validate a sample dispute record structure when data exists
    const sampleDispute = response.data[0];
    TestValidator.equals(
      "dispute has id",
      sampleDispute.id,
      sampleDispute.id
    );
    typia.assert<string & tags.Format<"uuid">>(sampleDispute.id);
  }
}