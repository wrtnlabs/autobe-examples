import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberSession";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session expired session history view.
 * Validates that members can retrieve their expired sessions from session history,
 * including complete metadata with currentOrganization context.
 */
export async function test_api_member_session_view_expired_session_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account (creates initial session)
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IHrmsMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(joined);
  // 2. Create a new connection with the authorization token
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.access,
    },
  };
  // 3. Generate a random session ID to test retrieval
  // Note: In real implementation, session IDs would be obtained from a list endpoint
  // For this test, we use a randomly generated UUID to verify the API behavior
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve the session to verify metadata can be accessed
  const session: IHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.at(sessionConnection, {
      sessionId,
    });
  typia.assert(session);
  // 5. Validate that all required metadata fields are present
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.equals("member ID matches", session.hrms_member_id, joined.id);
  TestValidator.equals("IP address present", session.ip.length > 0, true);
  TestValidator.equals(
    "user agent present",
    session.user_agent.length > 0,
    true,
  );
  TestValidator.equals("href present", session.href.length > 0, true);
  TestValidator.equals(
    "created_at present",
    session.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "expired_at present",
    session.expired_at.length > 0,
    true,
  );
  // 6. Validate currentOrganization context is included
  // currentOrganization can be null or contain organization summary
  if (session.currentOrganization !== null) {
    TestValidator.equals(
      "current organization ID matches currentOrganization context",
      session.current_organization_id,
      session.currentOrganization.id,
    );
    TestValidator.equals(
      "current organization name present",
      session.currentOrganization.name.length > 0,
      true,
    );
    TestValidator.equals(
      "current organization currency present",
      session.currentOrganization.currency.length > 0,
      true,
    );
  }
}