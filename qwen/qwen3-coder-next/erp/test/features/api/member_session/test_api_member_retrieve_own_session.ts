import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_retrieve_own_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to establish a session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Use the connection with the authorization header automatically set
  // 3. Retrieve the session
  const sessionConnection: api.IConnection = { host: connection.host };
  const session = await api.functional.hrmTracker.member.sessions.at(
    sessionConnection,
    {
      sessionId: authorized.id,
    },
  );
  typia.assert(session);
  // Validate session structure and member summary
  TestValidator.equals("session ID matches", session.id, authorized.id);
  TestValidator.equals("member ID matches", session.member.id, authorized.id);
  // Removed email validation as session.member is ISummary which doesn't include email property
  TestValidator.equals(
    "display name matches",
    session.member.display_name,
    authorized.display_name,
  );
  TestValidator.equals("phone matches", session.member.phone, authorized.phone);
  TestValidator.equals(
    "avatar URL matches",
    session.member.avatar_url,
    authorized.avatar_url,
  );
  TestValidator.equals(
    "status matches",
    session.member.status,
    authorized.status,
  );
  TestValidator.equals(
    "email verified matches",
    session.member.email_verified,
    authorized.email_verified,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    new Date(session.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "expires_at is valid datetime",
    new Date(session.expires_at) > new Date(),
  );
  TestValidator.predicate(
    "last_activity_at is valid datetime",
    new Date(session.last_activity_at) <= new Date(),
  );
  TestValidator.predicate(
    "access_token is present",
    session.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token is present",
    session.refresh_token.length > 0,
  );
}