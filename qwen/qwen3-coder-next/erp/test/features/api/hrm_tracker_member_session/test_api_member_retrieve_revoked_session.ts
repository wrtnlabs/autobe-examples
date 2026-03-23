import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_retrieve_revoked_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member via utility function to establish session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  typia.assert(member);
  // 2. Get session list to retrieve session ID
  const sessionList = await api.functional.hrmTracker.member.sessions.index(
    memberConnection,
    {
      body: {
        member_id: member.id,
        revoked: false,
      } satisfies IHrmTrackerMemberSession.IRequest,
    },
  );
  typia.assert(sessionList);
  TestValidator.predicate("has active session", sessionList.data.length > 0);
  const sessionId = sessionList.data[0].id;
  // 3. Revoke the session by querying with revoked=true
  await api.functional.hrmTracker.member.sessions.index(memberConnection, {
    body: {
      member_id: member.id,
      revoked: true,
    } satisfies IHrmTrackerMemberSession.IRequest,
  });
  // 4. Attempt to retrieve the revoked session - should return 403 Forbidden
  await TestValidator.httpError(
    "revoked session returns 403 Forbidden",
    403,
    async () => {
      await api.functional.hrmTracker.member.sessions.at(memberConnection, {
        sessionId: sessionId,
      });
    },
  );
}
