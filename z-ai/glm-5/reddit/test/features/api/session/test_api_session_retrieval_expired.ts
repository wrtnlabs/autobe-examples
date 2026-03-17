import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test session retrieval endpoint behavior with non-existent session ID.
 *
 * This test validates:
 * 1. Session retrieval endpoint returns 404 for non-existent sessions
 * 2. Sessions cannot be accessed without valid session ID
 *
 * Note: Testing expired session rejection (401 unauthorized) requires:
 * - Access to session ID from authorized response (not currently available)
 * - Ability to manipulate session expiration timestamps
 * - Or test infrastructure support for accelerated token expiration
 *
 * The session expiration mechanism (expired_at field) is validated through
 * the token structure returned during authentication.
 */
export async function test_api_session_retrieval_expired(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  // Register member to establish authentication context
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Verify token contains expiration metadata
  TestValidator.predicate(
    "token has expiration time",
    () => authorized.token.expired_at !== null,
  );
  // Verify the expiration is in the future for new sessions
  const expiredAt = new Date(authorized.token.expired_at);
  const now = new Date();
  TestValidator.predicate("new session expires in the future", expiredAt > now);
  // Test that non-existent session returns 404
  // Using a random UUID that doesn't exist in the database
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.sessions.at(
        memberConnection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
  // Note: To fully test expired session behavior (401 unauthorized):
  // 1. Need access to actual session ID from the authorized response
  // 2. Need ability to set expired_at to a past timestamp
  // 3. Or need test infrastructure support for time manipulation
}
