import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Retrieve guest session by UUID
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const guestSession = await api.functional.erpHrm.member.guest_sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(guestSession);
}
