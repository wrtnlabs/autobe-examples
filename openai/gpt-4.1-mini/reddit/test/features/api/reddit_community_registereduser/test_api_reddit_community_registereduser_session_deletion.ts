import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunityRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegistereduserSession";

export async function test_api_reddit_community_registereduser_session_deletion(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain authorization
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email,
        password,
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Create a new session for the registered user
  const nowIso = new Date().toISOString();
  const ipOctet3 = typia.random<
    number & tags.Type<"uint32"> & tags.Maximum<255>
  >();
  const ipOctet4 = typia.random<
    number & tags.Type<"uint32"> & tags.Maximum<255>
  >();
  const sessionCreateBody = {
    ip: `192.168.${ipOctet3}.${ipOctet4}`,
    href: "https://redditcommunity.example.com/home",
    referrer: "https://redditcommunity.example.com/login",
    created_at: nowIso,
    expired_at: null,
  } satisfies IRedditCommunityRegistereduserSession.ICreate;

  const session: IRedditCommunityRegistereduserSession =
    await api.functional.redditCommunity.registeredUser.redditCommunityRegisteredusers.sessions.create(
      connection,
      {
        redditCommunityRegistereduserId: registeredUser.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 3. Delete the created session
  await api.functional.redditCommunity.registeredUser.redditCommunityRegisteredusers.sessions.erase(
    connection,
    {
      redditCommunityRegistereduserId: registeredUser.id,
      id: session.id,
    },
  );
}
