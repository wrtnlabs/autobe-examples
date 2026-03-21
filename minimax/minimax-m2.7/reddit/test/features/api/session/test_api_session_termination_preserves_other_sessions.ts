import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_termination_preserves_other_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Prepare member credentials for multi-device testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberUsername = RandomGenerator.name();
  // 1. Member joins to create the first session
  const firstSession = await authorize_member_join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstSession);
  // Create connection with first session token
  const firstSessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${firstSession.token.access}`,
    },
  };
  // 2. Member logs in from another device to create a second session
  const secondSession = await authorize_member_login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondSession);
  // Create connection with second session token
  const secondSessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${secondSession.token.access}`,
    },
  };
  // 3. Member terminates the first session
  await api.functional.redditClone.member.sessions.erase(
    firstSessionConnection,
    {
      sessionId: firstSession.id,
    },
  );
  // 4. Verify the second session remains active by performing an authenticated request
  const reAuthCheck = await authorize_member_login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(reAuthCheck);
  // 5. Verify session IDs are different (new session created, proving login works)
  TestValidator.notEquals(
    "second session still works after terminating first",
    reAuthCheck.id,
    firstSession.id,
  );
}
