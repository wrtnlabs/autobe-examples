import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieval of a non-existent activity log entry returns HTTP 404 Not Found.
   *
   * Validates that the activity log retrieval endpoint properly handles requests for
   * activity log entries that do not exist in the system. The test creates a member
   * account with organizational context to ensure proper authentication setup, then
   * attempts to retrieve a randomly generated UUID that is guaranteed not to exist
   * in the activity logs table.
   *
   * Special attention is given to verifying that the system returns the appropriate
   * HTTP 404 status code with a meaningful error message when attempting to access
   * a non-existent activity log entry. This ensures proper error handling for
   * missing resource scenarios.
   *
   * 1. Create member account with organization via POST /hrmPlatform/auth/member/join
   * 2. Set up authenticated connection using the returned access token
   * 3. Generate random UUID that does not exist in the system
   * 4. Attempt to retrieve non-existent activity log
   * 5. Verify HTTP 404 Not Found response is returned
   */
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 5,
        wordMax: 8,
      }),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create authenticated connection for API calls
  const testConnection: api.IConnection = { host: connection.host };
  testConnection.headers = {
    ...testConnection.headers,
    Authorization: authorized.token.access,
  };
  // 3. Generate random UUID that does not exist in the system
  const nonExistentActivityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve the non-existent activity log
  // This should return HTTP 404 Not Found
  await TestValidator.error(
    "should return 404 for non-existent activity log",
    async () => {
      await api.functional.hrmPlatform.member.activity_logs.at(testConnection, {
        activityLogId: nonExistentActivityLogId,
      });
    },
  );
}
