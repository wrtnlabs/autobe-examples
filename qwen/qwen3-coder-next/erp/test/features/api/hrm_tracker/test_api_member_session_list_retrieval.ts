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

export async function test_api_member_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and gets authorization token
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
  // 2. Retrieve session list as the authenticated member
  const sessionList = await api.functional.hrmTracker.member.sessions.index(
    memberConnection,
    {
      body: {
        member_id: member.id,
      },
    },
  );
  typia.assert(sessionList);
  // 3. Validate results
  TestValidator.equals("pagination exists", sessionList.pagination.current, 1);
  TestValidator.predicate("has records", sessionList.data.length > 0);
  // 4. Validate each session belongs to the authenticated member
  sessionList.data.forEach((session) => {
    TestValidator.equals("member ID matches", session.member.id, member.id);
    TestValidator.equals(
      "display name matches",
      session.member.display_name,
      member.display_name,
    );
    TestValidator.equals("phone matches", session.member.phone, member.phone);
    TestValidator.equals(
      "status matches",
      session.member.status,
      member.status,
    );
    TestValidator.equals(
      "email verified matches",
      session.member.email_verified,
      member.email_verified,
    );
    TestValidator.predicate(
      "avatar URL valid",
      session.member.avatar_url === null ||
        typeof session.member.avatar_url === "string",
    );
  });
}
