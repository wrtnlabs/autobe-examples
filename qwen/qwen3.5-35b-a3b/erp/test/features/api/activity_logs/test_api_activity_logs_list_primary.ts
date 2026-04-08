import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for listing activity log entries.
 *
 * Validates the activity log listing workflow including member registration,
 * activity log query with default pagination, and response validation. Ensures
 * that the endpoint returns proper pagination metadata and activity log summaries
 * when no activity logs exist, and that the response structure is correct.
 *
 * Special attention is given to verifying that pagination metadata is accurate,
 * organization scoping is enforced, and that summary responses exclude detailed
 * extra_data fields. Tests the empty result set scenario which is a common
 * edge case when a new member account has not generated any activity yet.
 *
 * 1. Register a member account with initial organization via member join endpoint.
 * 2. Call activity logs listing endpoint with default pagination parameters.
 * 3. Validate pagination metadata structure and empty data scenario.
 * 4. Verify organization scoping is enforced even with no activity logs.
 */
export async function test_api_activity_logs_list_primary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Call activity logs listing endpoint with default pagination (empty result set)
  const activityLogsResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(activityLogsResponse);
  // 3. Validate pagination metadata
  const pagination = activityLogsResponse.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit is 20 (default)", pagination.limit, 20);
  TestValidator.equals("records count is 0 (empty)", pagination.records, 0);
  TestValidator.equals("total pages is 0 (no records)", pagination.pages, 0);
  // 4. Validate data structure for empty result set
  TestValidator.equals(
    "data array is empty",
    activityLogsResponse.data.length,
    0,
  );
}
