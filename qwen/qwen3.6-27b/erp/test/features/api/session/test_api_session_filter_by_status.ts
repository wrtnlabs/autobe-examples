import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member to create an active session
  const joined = await authorize_member_join(connection, {});
  // Create member-specific connection
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${joined.token.access}`,
    },
  };
  // 2. Query active sessions
  const activeBody = {
    status: "active",
  } satisfies IHrmPlatformMemberSession.IRequest;
  const activeResult = await api.functional.hrmPlatform.member.sessions.index(
    memberConnection,
    { body: activeBody },
  );
  typia.assert<IPageIHrmPlatformMemberSession.ISummary>(activeResult);
  TestValidator.predicate(
    "active sessions returned",
    activeResult.data.length > 0,
  );
  // 3. Query expired sessions
  const expiredBody = {
    status: "expired",
  } satisfies IHrmPlatformMemberSession.IRequest;
  const expiredResult = await api.functional.hrmPlatform.member.sessions.index(
    memberConnection,
    { body: expiredBody },
  );
  typia.assert<IPageIHrmPlatformMemberSession.ISummary>(expiredResult);
  TestValidator.predicate("expired sessions structure valid", true);
}
