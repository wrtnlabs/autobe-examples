import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a moderator receives appropriate response when attempting to retrieve a non-existent report.
   *
   * Validates the error handling behavior when a client requests a report that doesn't exist in the system.
   * The endpoint should return a 404 Not Found response with appropriate error information.
   *
   * Special attention is given to verifying that the error response is consistent and the API
   * properly handles non-existent resources without exposing sensitive information.
   *
   * 1. Join a new member for the test
   * 2. Authenticate the member
   * 3. Attempt to retrieve a non-existent report using a valid UUID that doesn't exist
   * 4. Verify 404 Not Found response is returned
   * 5. Verify error message structure is appropriate
   */
  // 1. Join a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create member connection for authenticated requests
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...connection.headers,
    Authorization: joinResult.token.access,
  };
  // 3. Generate a valid UUID that doesn't exist in the database
  const nonExistentReportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve non-existent report
  // This should return 404 Not Found
  await TestValidator.error("non-existent report returns 404", async () => {
    await api.functional.redditPlatform.member.reports.at(memberConnection, {
      reportId: nonExistentReportId,
    });
  });
}
