import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModeratorSession";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize moderator join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ICommunityBbsModerator.IJoin;
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: moderatorData,
    });
  typia.assert(moderator);
  // Step 2: Create a new moderator session
  const session: ICommunityBbsModeratorSession =
    await api.functional.communityBbs.moderator.moderator_sessions.create(
      moderatorConnection,
    );
  typia.assert(session);
  // Step 3: Validate session properties
  TestValidator.notEquals(
    "session token is not empty",
    session.session_token,
    "",
  );
  TestValidator.predicate("session expiration is in the future", () => {
    const expiresAt = new Date(session.expires_at);
    const now = new Date();
    return expiresAt > now;
  });
  TestValidator.notEquals("IP address is not empty", session.ip_address, "");
  TestValidator.notEquals("user agent is not empty", session.user_agent, "");
}
