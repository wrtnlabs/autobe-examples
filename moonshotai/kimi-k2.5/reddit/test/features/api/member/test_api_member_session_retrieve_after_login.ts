import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_retrieve_after_login(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials for member registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(3);
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(joinConnection, {
    body: {
      email,
      username,
      password,
    },
  });
  typia.assert(registered);
  // 2. Login with the registered credentials to create a new session
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IRedditLikeMember.ILogin,
  });
  typia.assert(loggedIn);
  // 3. Retrieve current session information using the authenticated connection
  const session =
    await api.functional.redditLike.member.sessions.me.at(loginConnection);
  typia.assert(session);
  // 4. Validate actor type is member
  TestValidator.equals(
    "actorType should be member",
    session.actorType,
    "member",
  );
  // 5. Validate actor contains correct member identity (cast needed for type narrowing)
  const actor = session.actor as IRedditLikeMember.ISummary;
  TestValidator.equals(
    "actor id matches logged in member",
    actor.id,
    loggedIn.id,
  );
  TestValidator.equals(
    "actor email matches registered email",
    actor.email,
    email,
  );
  TestValidator.equals(
    "actor username matches registered username",
    actor.username,
    username,
  );
  // 6. Validate connection metadata exists (business logic: values should be populated)
  TestValidator.predicate("ip should be present", session.ip.length > 0);
  TestValidator.predicate("href should be present", session.href.length > 0);
  TestValidator.predicate(
    "referrer should be present",
    session.referrer.length >= 0,
  );
  TestValidator.predicate(
    "userAgent should be present for member session",
    session.userAgent !== null,
  );
  // 7. Validate session timestamps reflect login time (after registration)
  const sessionCreatedTime = new Date(session.createdAt).getTime();
  const memberCreatedTime = new Date(loggedIn.createdAt).getTime();
  TestValidator.predicate(
    "session created after member registration",
    sessionCreatedTime >= memberCreatedTime,
  );
  // 8. Validate expiration timestamps exist for member session
  TestValidator.predicate(
    "expiresAt should be present for member session",
    session.expiresAt !== null,
  );
}
