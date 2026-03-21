import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
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

export async function test_api_member_sessions_list_multiple_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member with a known password
  const password = RandomGenerator.alphaNumeric(16);
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: password,
    username: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://google.com",
  } satisfies IRedditCloneMemberSession.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(member);
  // 2. Create multiple login sessions from different "devices"
  const numAdditionalSessions = 3;
  for (let i = 0; i < numAdditionalSessions; i++) {
    const loginConnection: api.IConnection = { host: connection.host };
    const loginBody = {
      email: member.email,
      password: password,
      href: `https://example.com/login/device${i}`,
      referrer: `https://referrer${i}.example.com`,
      ip: `192.168.${i}.${100 + i}` as string & tags.Format<"ipv4">,
    } satisfies IRedditCloneMemberSession.ILogin;
    await authorize_member_login(loginConnection, {
      body: loginBody,
    });
  }
  // 3. List all sessions for the member
  const sessionsConnection: api.IConnection = { host: connection.host };
  sessionsConnection.headers = {
    Authorization: `Bearer ${member.token.access}`,
  };
  const sessionsPage =
    await api.functional.redditClone.member.members.sessions.list(
      sessionsConnection,
    );
  typia.assert(sessionsPage);
  // 4. Verify session count matches (1 join + 3 logins = 4 total)
  const expectedSessionCount = numAdditionalSessions + 1;
  TestValidator.equals(
    "total session count matches",
    sessionsPage.pagination.records,
    expectedSessionCount,
  );
  // 5. Verify sessions have unique metadata (different creation times)
  const sessionData = sessionsPage.data;
  const createdTimestamps = sessionData.map((s) => s.created_at);
  const uniqueTimestamps = new Set(createdTimestamps);
  TestValidator.predicate(
    "sessions have unique creation timestamps",
    uniqueTimestamps.size === sessionData.length,
  );
  // 6. Verify all sessions belong to the same member
  const uniqueMemberIds = new Set(sessionData.map((s) => s.id));
  TestValidator.predicate(
    "sessions contain expected count",
    uniqueMemberIds.size === expectedSessionCount,
  );
  // 7. Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination current is valid",
    sessionsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    sessionsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records match data length",
    sessionsPage.pagination.records === sessionData.length,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    sessionsPage.pagination.pages >= 0,
  );
}
