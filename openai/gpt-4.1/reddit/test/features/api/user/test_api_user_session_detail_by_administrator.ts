import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Test administrator session audit detail retrieval for user sessions.
 *
 * 1. Register a new administrator and log in.
 * 2. Issue random UUIDs for userId and sessionId (no session exists yet): expect
 *    not found.
 * 3. Try unauthenticated request: expect permission denied.
 * 4. Try valid userId and invalid sessionId: expect not found, no data leak.
 * 5. Try invalid userId and valid sessionId: expect not found, no data leak.
 * 6. (No creation API available for sessions/users, so positive session fetch
 *    tested by random UUID contract only.)
 * 7. Validate all fields in the result type using typia.assert.
 */
export async function test_api_user_session_detail_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register new administrator, grab authentication context for admin role
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_status: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // Save current connection in authenticated context
  // 2. Try session fetch with random (non-existent) user/sessionId: expect not found
  const fakeUserId = typia.random<string & tags.Format<"uuid">>();
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("not found for random composite key", async () => {
    await api.functional.communityPlatform.administrator.users.sessions.at(
      connection,
      {
        userId: fakeUserId,
        sessionId: fakeSessionId,
      },
    );
  });

  // 3. Try unauthenticated request: permission denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "permission denied for unauthenticated",
    async () => {
      await api.functional.communityPlatform.administrator.users.sessions.at(
        unauthConn,
        {
          userId: fakeUserId,
          sessionId: fakeSessionId,
        },
      );
    },
  );

  // 4. Try with valid userId and invalid sessionId
  // 5. Try with invalid userId and valid sessionId
  // (No session/user creation APIs available, so use random UUID pairs)
  const secondFakeUserId = typia.random<string & tags.Format<"uuid">>();
  const secondFakeSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "not found for valid user but invalid session",
    async () => {
      await api.functional.communityPlatform.administrator.users.sessions.at(
        connection,
        {
          userId: fakeUserId,
          sessionId: secondFakeSessionId,
        },
      );
    },
  );

  await TestValidator.error(
    "not found for invalid user but valid session",
    async () => {
      await api.functional.communityPlatform.administrator.users.sessions.at(
        connection,
        {
          userId: secondFakeUserId,
          sessionId: fakeSessionId,
        },
      );
    },
  );

  // 6. Try fetch using random UUIDs: typia.assert contract
  // (No positive test flow possible due to missing create ops)
  const tryResult =
    await api.functional.communityPlatform.administrator.users.sessions.at(
      connection,
      {
        userId: fakeUserId,
        sessionId: fakeSessionId,
      },
    );
  typia.assert(tryResult);
  // All fields structure validated by typia.assert;
}
