import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_retrieval_own_session_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member-specific connection for isolation
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Join a new member - creates account, first organization (owner role), and establishes session
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Retrieve the session using the authenticated member connection
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const session = await api.functional.erpHrm.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // Step 3: Validate session structure
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.equals(
    "member email matches",
    session.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member display name matches",
    session.member.displayName,
    authorized.display_name,
  );
  // Step 4: Validate organization is populated (join creates and selects first organization)
  TestValidator.predicate(
    "organization is populated",
    session.organization !== null,
  );
  // Step 5: Validate session is valid (not expired)
  const now = new Date();
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate("session has not expired", expiredAt > now);
  // Step 6: Validate timestamps are properly set
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(session.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(session.updated_at).getTime()),
  );
}
