import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a member session that does not exist.
 *
 * Validates that attempting to retrieve a non-existent member session returns a proper 404 Not Found error response. This test ensures the system handles missing session records gracefully without leaking information about whether sessions exist or not.
 *
 * The test authenticates a member first to establish a valid session context, then attempts to retrieve a session using a randomly generated UUID that was never created in the system.
 *
 * 1. Authenticate as a new member to establish session context.
 * 2. Generate a random UUID that does not correspond to any existing session.
 * 3. Attempt to retrieve the non-existent session using the invalid UUID.
 * 4. Verify that the API returns a 404 Not Found error response.
 */
export async function test_api_member_session_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to establish session context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Generate a random UUID that does not exist in the system
  const invalidSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent session and validate 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent session",
    404,
    async () =>
      await api.functional.redditClone.member.member.sessions.at(
        memberConnection,
        {
          sessionId: invalidSessionId,
        },
      ),
  );
}
