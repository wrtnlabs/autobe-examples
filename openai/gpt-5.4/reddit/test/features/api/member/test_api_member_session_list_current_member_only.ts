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

export async function test_api_member_session_list_current_member_only(
  connection: api.IConnection,
): Promise<void> {
  const firstMemberIp = "10.10.10.11";
  const firstMemberHref = `https://member-${RandomGenerator.alphabets(8)}.example.com/${RandomGenerator.alphabets(6)}`;
  const firstMemberReferrer = `https://ref-${RandomGenerator.alphabets(8)}.example.com/${RandomGenerator.alphabets(6)}`;
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: firstMemberHref,
      referrer: firstMemberReferrer,
      ip: firstMemberIp,
    },
  });
  typia.assert(firstJoin);
  const secondMemberIp = "10.10.10.22";
  const secondMemberHref = `https://member-${RandomGenerator.alphabets(8)}.example.com/${RandomGenerator.alphabets(6)}`;
  const secondMemberReferrer = `https://ref-${RandomGenerator.alphabets(8)}.example.com/${RandomGenerator.alphabets(6)}`;
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondJoin = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: secondMemberHref,
      referrer: secondMemberReferrer,
      ip: secondMemberIp,
    },
  });
  typia.assert(secondJoin);
  const requestBody = {
    page: 1,
    limit: 100,
    sort: "-created_at",
  } satisfies ICommunityPlatformMemberSession.IRequest;
  const sessions = await api.functional.communityPlatform.member.sessions.index(
    firstMemberConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(sessions);
  TestValidator.equals(
    "current page reflects the request",
    sessions.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "page limit reflects the request",
    sessions.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "first member has at least one recorded session",
    sessions.data.length > 0,
  );
  TestValidator.predicate(
    "result includes the first member initial session metadata",
    ArrayUtil.has(
      sessions.data,
      (session) =>
        session.ip === firstMemberIp &&
        session.href === firstMemberHref &&
        session.referrer === firstMemberReferrer,
    ),
  );
  TestValidator.predicate(
    "no session exposes the second member unique metadata",
    sessions.data.every(
      (session) =>
        !(
          session.ip === secondMemberIp &&
          session.href === secondMemberHref &&
          session.referrer === secondMemberReferrer
        ),
    ),
  );
}
