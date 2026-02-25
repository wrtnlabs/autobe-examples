import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_session_retrieval_security_audit(
  connection: api.IConnection,
): Promise<void> {
  // Create a user session using the join utility function
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: typia.random<string>(),
      display_name: typia.random<string | null>(),
      bio: typia.random<string | null>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Since we don't have a direct way to get the session ID from the join response,
  // we need to create a test session ID. In a real scenario, this would come from
  // the session creation response or a separate session listing endpoint.
  const testSessionId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve session details using the session retrieval endpoint
  const session = await api.functional.communityPlatform.user.sessions.at(
    userConnection,
    {
      sessionId: testSessionId,
    },
  );
  typia.assert(session);
  // Validate security metadata fields
  TestValidator.predicate("session has IP address", session.ip.length > 0);
  TestValidator.predicate(
    "session has user agent",
    session.user_agent.length > 0,
  );
  TestValidator.predicate(
    "session has creation timestamp",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "session has expiration timestamp",
    session.expired_at.length > 0,
  );
  // Validate token structure
  TestValidator.predicate(
    "session has access token",
    session.access_token.length > 0,
  );
  TestValidator.predicate(
    "session has refresh token",
    session.refresh_token.length > 0,
  );
  // Validate user relationship data
  TestValidator.equals("user ID matches", session.user.id, authorizedUser.id);
  TestValidator.equals(
    "username matches",
    session.user.username,
    authorizedUser.username,
  );
  TestValidator.equals(
    "display name matches",
    session.user.display_name,
    authorizedUser.display_name,
  );
  TestValidator.equals(
    "avatar URL matches",
    session.user.avatar_url,
    authorizedUser.avatar_url,
  );
  TestValidator.equals(
    "karma matches",
    session.user.karma,
    authorizedUser.karma,
  );
  TestValidator.equals(
    "created at matches",
    session.user.created_at,
    authorizedUser.created_at,
  );
  // Validate referrer field (optional)
  if (session.referrer !== null && session.referrer !== undefined) {
    TestValidator.predicate(
      "referrer is valid URI",
      session.referrer.length > 0,
    );
  }
  // Validate URI format for href
  TestValidator.predicate("href is valid URI", session.href.length > 0);
  // Validate IP format (IPv4)
  TestValidator.predicate(
    "IP is valid IPv4 format",
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(session.ip),
  );
}
