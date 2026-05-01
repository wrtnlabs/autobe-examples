import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that requesting a non-existent activity log returns 404 Not Found.
 *
 * Validates the not-found error handling for the single activity log retrieval endpoint. A newly authenticated member attempts to fetch an activity log by a randomly generated UUID that does not correspond to any existing record. The test verifies that the server responds with a 404 HTTP error, confirming proper error handling for missing resources.
 *
 * Per the endpoint specification, the 404 response must not distinguish between a genuinely missing entry and one belonging to a different organization — this prevents cross-organization information leakage. Since the lookup fails at the ID matching stage, no additional organization-scoped data setup is required.
 *
 * 1. Member authenticates via join to obtain valid credentials.
 * 2. Member requests an activity log with a randomly generated UUID.
 * 3. Validates the response is a 404 HttpError.
 */
export async function test_api_activity_log_not_found_random_uuid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Request a non-existent activity log with a random UUID
  await TestValidator.httpError(
    "non-existent activity log returns 404",
    404,
    async () =>
      await api.functional.erpHrm.member.activity_logs.at(memberConnection, {
        activityLogId: typia.random<string & tags.Format<"uuid">>(),
      }),
  );
}
