import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_list_own_history(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/erpHrmTime/member/join",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    Authorization: authorized.token.access,
  };
  const page = await api.functional.erpHrmTime.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "pagination metadata exists",
    page.pagination.current >= 1 &&
      page.pagination.limit >= 0 &&
      page.pagination.records >= 0 &&
      page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size is within requested limit",
    page.data.length <= page.pagination.limit,
  );
  if (page.data.length >= 2) {
    TestValidator.predicate(
      "default order is newest first",
      page.data[0].created_at >= page.data[1].created_at,
    );
  }
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/erpHrmTime/member/join?second=1",
      referrer: "https://example.com/other",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(secondAuthorized);
  const pageAfterSecondMember =
    await api.functional.erpHrmTime.member.sessions.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeMemberSession.IRequest,
    });
  typia.assert(pageAfterSecondMember);
  TestValidator.equals(
    "current member session history remains scoped to the authenticated member",
    pageAfterSecondMember.data.map((session) => session.id),
    page.data.map((session) => session.id),
  );
  TestValidator.equals(
    "pagination count remains stable after creating another member",
    pageAfterSecondMember.pagination.records,
    page.pagination.records,
  );
}
