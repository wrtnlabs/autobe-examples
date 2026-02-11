import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const { access } = await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // 2. Retrieve session details using the generated access token as session ID
  const session = await api.functional.community.member.sessions.at(
    memberConnection,
    { id: access },
  );
  typia.assert(session);
}
