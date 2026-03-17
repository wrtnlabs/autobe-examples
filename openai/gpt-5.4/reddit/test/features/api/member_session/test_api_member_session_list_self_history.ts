import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_list_self_history(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: `https://example.com/join/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/ref/${RandomGenerator.alphaNumeric(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies Partial<ICommunityPlatformMember.IJoin>;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const request = {} satisfies ICommunityPlatformMemberSession.IRequest;
  const firstPage =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination current is non-negative",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "session history has at least one session",
    firstPage.data.length >= 1,
  );
  const joinedSession = firstPage.data.find(
    (session) =>
      session.href === joinInput.href &&
      session.referrer === joinInput.referrer &&
      session.ip === joinInput.ip,
  );
  TestValidator.predicate(
    "joined session is included in authenticated member history",
    joinedSession !== undefined,
  );
  for (const session of firstPage.data) {
    TestValidator.predicate(
      "session item exposes summary shape only",
      typia.equals<ICommunityPlatformMemberSession.ISummary>(session),
    );
    TestValidator.predicate("session id is not empty", session.id.length > 0);
    TestValidator.predicate("session ip is not empty", session.ip.length > 0);
  }
  const secondPage =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(secondPage);
  const joinedSessionAgain = secondPage.data.find(
    (session) =>
      session.href === joinInput.href &&
      session.referrer === joinInput.referrer &&
      session.ip === joinInput.ip,
  );
  TestValidator.predicate(
    "joined session remains queryable on repeated read",
    joinedSessionAgain !== undefined,
  );
  const stableFirst = typia.assert(joinedSession!);
  const stableSecond = typia.assert(joinedSessionAgain!);
  TestValidator.equals(
    "session id remains stable",
    stableFirst.id,
    stableSecond.id,
  );
  TestValidator.equals(
    "session created_at remains stable",
    stableFirst.created_at,
    stableSecond.created_at,
  );
  TestValidator.equals(
    "session expired_at remains stable",
    stableFirst.expired_at,
    stableSecond.expired_at,
  );
}
