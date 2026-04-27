import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_session_context(
  connection: api.IConnection,
): Promise<void> {
  // Register member with specific session context metadata
  const memberConnection: api.IConnection = { host: connection.host };
  const output = await authorize_member_join(memberConnection, {
    body: {
      display_name: "Session Test User",
      href: "https://app.example.com/register",
      referrer: "https://example.com/landing-page",
      ip: "192.168.1.100",
    },
  });
  typia.assert(output);
  // Validate session count
  TestValidator.equals("has exactly 1 session", output.sessions.length, 1);
  const session = output.sessions[0];
  // Validate session context metadata
  TestValidator.equals("session IP matches", session.ip, "192.168.1.100");
  TestValidator.equals(
    "session href matches",
    session.href,
    "https://app.example.com/register",
  );
  TestValidator.equals(
    "session referrer matches",
    session.referrer,
    "https://example.com/landing-page",
  );
  // Validate session references the correct member
  TestValidator.equals(
    "session member.id matches top-level member.id",
    session.member.id,
    output.id,
  );
  // Validate session timestamps
  TestValidator.predicate("session created_at is valid ISO date-time", () => {
    const date = new Date(session.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("session expired_at is valid ISO date-time", () => {
    const date = new Date(session.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate(
    "expired_at occurs after created_at",
    new Date(session.expired_at).getTime() >
      new Date(session.created_at).getTime(),
  );
}
