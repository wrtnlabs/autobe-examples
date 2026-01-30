import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModeratorSession";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderator_session_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create moderator account by joining
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 3: Establish moderator authentication session
  // This requires an authenticated moderator connection
  const moderatorSessionConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorSessionConnection, {
    body: {
      email: moderator.email,
      password_hash: (
        moderatorConnection.headers?.Authorization as string
      )?.replace("Bearer ", ""),
    } satisfies ICommunityBbsModerator.ILogin,
  });
  // Create session using properly authenticated moderator connection
  const session =
    await api.functional.communityBbs.moderator.moderator_sessions.create(
      moderatorSessionConnection,
    );
  typia.assert(session);
  // Step 4: Administrator retrieves the moderator's session using valid sessionId
  // Note: The session.session_token is the unique identifier of the session record in database
  const retrievedSession =
    await api.functional.communityBbs.moderator.moderator_sessions.at(
      adminConnection,
      {
        sessionId: session.session_token,
      },
    );
  typia.assert(retrievedSession);
  // Step 5: Validate session structure with full type validation (typia.assert handles everything)
  // All fields (session_token, ip_address, user_agent, created_at, expires_at) are validated by typia.assert
  // Step 6: Verify that unauthorized moderator cannot retrieve session (403 Forbidden)
  await TestValidator.error(
    "moderator cannot retrieve other sessions",
    async () => {
      await api.functional.communityBbs.moderator.moderator_sessions.at(
        moderatorSessionConnection,
        {
          sessionId: session.session_token,
        },
      );
    },
  );
  // Step 7: Verify that unauthenticated user cannot retrieve session (401 Unauthorized)
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "anonymous user cannot access sessions",
    async () => {
      await api.functional.communityBbs.moderator.moderator_sessions.at(
        anonymousConnection,
        {
          sessionId: session.session_token,
        },
      );
    },
  );
}
