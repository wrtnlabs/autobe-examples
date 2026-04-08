import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberSession";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session retrieval with non-existent session ID.
 *
 * Validates that when a member attempts to retrieve a session using an invalid or non-existent session ID (valid UUID format but no matching record), the system returns a 404 Not Found error. This ensures proper error handling for session lookup operations and prevents information leakage about session existence.
 *
 * The test follows this flow:
 * 1. Create a member account using authorize_member_join utility function
 * 2. Generate a valid UUID that does not correspond to any existing session
 * 3. Attempt to retrieve the non-existent session using api.functional.hrm.member.member.sessions.at
 * 4. Validate that the operation throws HttpError with 404 status code
 */
export async function test_api_member_session_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and establish initial session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate a valid UUID that does not exist in database
  const invalidSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent session - should throw 404
  await TestValidator.httpError(
    "session not found returns 404",
    404,
    async () => {
      await api.functional.hrm.member.member.sessions.at(memberConnection, {
        sessionId: invalidSessionId,
      });
    },
  );
}
