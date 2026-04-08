import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
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
 * Validates that attempting to retrieve a session that does not exist in the system returns an appropriate error response. The test authenticates a member account, then attempts to access a session using a randomly generated UUID that was never created. This ensures proper error handling for missing session resources and prevents information leakage about valid session IDs.
 *
 * 1. Register a new member account with valid credentials (email, password, username).
 * 2. Generate a random UUID that does not correspond to any existing session in the database.
 * 3. Attempt to retrieve the non-existent session using the member's authenticated connection.
 * 4. Validates that the API returns a 404 Not Found error response, confirming proper error handling for missing resources.
 */
export async function test_api_member_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Generate non-existent session ID
  const invalidSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent session
  await TestValidator.httpError("session not found", 404, async () => {
    await api.functional.redditLike.member.sessions.at(memberConnection, {
      sessionId: invalidSessionId,
    });
  });
}
