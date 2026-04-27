import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a non-moderator member receives an empty page when accessing the community reports endpoint.
 *
 * Only members who moderate one or more communities may see reports — this is enforced by the server which scopes results to communities the requesting member moderates. A member who has never created or moderated a community should receive a valid page response with zero records and an empty data array, rather than an authentication or authorization error.
 *
 * 1. Register member1 via `authorize_member_join` — this member does NOT create or moderate any community.
 * 2. Call the reports endpoint with default request body (no filters).
 * 3. Assert that the response succeeds (no error) and returns an empty paginated list with `data.length === 0` and `pagination.records === 0`.
 */
export async function test_api_reports_non_moderator_gets_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a regular member who is not a moderator of any community
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Retrieve reports as this non-moderator member
  const page = await api.functional.communityPlatform.member.reports.index(
    memberConnection,
    {
      body: {},
    } satisfies api.functional.communityPlatform.member.reports.index.Props,
  );
  typia.assert(page);
  // 3. Validate that the page is empty
  TestValidator.equals("data array is empty", page.data, []);
  TestValidator.equals("records count is 0", page.pagination.records, 0);
  TestValidator.equals("pages count is 0", page.pagination.pages, 0);
}
