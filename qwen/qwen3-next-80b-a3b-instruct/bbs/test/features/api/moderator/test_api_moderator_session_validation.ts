import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderator_session_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a moderator account via join
  const joinConnection: api.IConnection = { host: connection.host };
  const randomPassword = RandomGenerator.alphaNumeric(16);
  const moderator: IAdmin.IAuthorized = await authorize_admin_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: randomPassword,
      } satisfies IAdmin.IJoin,
    },
  );
  typia.assert(moderator);
  // Step 2: Authenticate as the moderator to establish a session (session created server-side)
  const loginConnection: api.IConnection = { host: connection.host };
  const authenticatedModerator: IAdmin.IAuthorized =
    await authorize_admin_login(loginConnection, {
      body: {
        email: moderator.id satisfies string as string, // Strip UUID tag to satisfy string type expected by ILogin
        password: randomPassword,
      } satisfies IAdmin.ILogin,
    });
  typia.assert(authenticatedModerator);
  // Step 3: Extract the sessionId from the JWT access token (stored in payload)
  const tokenParts = authenticatedModerator.token.access.split(".");
  if (tokenParts.length !== 3) {
    throw new Error("Invalid JWT token format");
  }
  // Decode the payload (base64url encoding)
  const payloadBase64 = tokenParts[1];
  const decodedPayload = atob(
    payloadBase64.replace(/-/g, "+").replace(/_/g, "/"),
  );
  const payload: any = JSON.parse(decodedPayload);
  // Extract sessionId from payload (either 'sessionId' or 'sid')
  const sessionId = payload.sessionId || payload.sid;
  if (
    !sessionId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      sessionId,
    )
  ) {
    throw new Error("Session ID not found in token or invalid format");
  }
  // Step 4: Validate the moderator session
  const validateConnection: api.IConnection = { host: connection.host };
  // Use the authentication headers from the logged-in connection
  validateConnection.headers = loginConnection.headers;
  const session: IDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.validate.at(
      validateConnection,
      {
        moderatorId: moderator.id, // Use the moderatorId from the join response
        sessionId: sessionId, // Use the sessionId extracted from the JWT token
      },
    );
  typia.assert(session);
  // Step 5: Validate the session metadata
  TestValidator.equals(
    "moderatorId matches",
    session.moderatorId,
    moderator.id,
  );
  TestValidator.equals("sessionId matches", session.sessionId, sessionId);
  TestValidator.predicate(
    "expiresAt is in the future",
    new Date(session.expiresAt) > new Date(),
  );
  TestValidator.equals("session is active", session.isActive, true);
}