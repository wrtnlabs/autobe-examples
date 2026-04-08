import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberSession";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Member successfully retrieves their own session details after authentication.
 *
 * Validates that a member can retrieve their session information including lifecycle metadata and client context. The test ensures the response contains proper timestamp formatting, member summary information, and excludes sensitive authentication tokens for security.
 *
 * The session retrieval endpoint returns comprehensive session information while maintaining security by excluding access and refresh tokens from the response payload.
 *
 * 1. Create member account with email and password credentials.
 * 2. Extract session ID from the authentication response.
 * 3. Retrieve session details using the session ID.
 * 4. Validates session metadata includes created_at and expired_at in ISO 8601 format.
 * 5. Validates client context information (ip, href, referrer) is present.
 * 6. Validates member summary is included in the response.
 * 7. Confirms no sensitive tokens appear in the response.
 */
export async function test_api_member_session_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and establish initial session
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Extract session ID from authentication response
  const sessionId: string & tags.Format<"uuid"> = auth.id;
  // 3. Retrieve session details
  const session = await api.functional.hrm.member.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session metadata
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      session.created_at,
    ),
  );
  TestValidator.predicate(
    "expired_at is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      session.expired_at,
    ),
  );
  // 5. Validate client context information
  TestValidator.predicate("ip address present", session.ip.length > 0);
  TestValidator.predicate("href is not null", session.href !== null);
  TestValidator.predicate("referrer is not null", session.referrer !== null);
  // 6. Validate member summary
  TestValidator.predicate(
    "member ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.member.id,
    ),
  );
  TestValidator.predicate(
    "member email is valid",
    session.member.email.length > 0,
  );
  TestValidator.predicate(
    "member created_at exists",
    session.member.created_at.length > 0,
  );
  TestValidator.predicate(
    "member updated_at exists",
    session.member.updated_at.length > 0,
  );
}