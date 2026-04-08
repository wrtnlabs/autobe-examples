import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberSession";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a member session by session ID.
 *
 * Validates that member sessions can be retrieved using their unique session identifier. The test registers a new member account to establish authentication, then attempts to retrieve a session to verify the session retrieval endpoint functions correctly.
 *
 * This test ensures that the session retrieval endpoint is accessible and returns properly structured session data. The endpoint should handle both existing and non-existing session IDs appropriately.
 *
 * 1. Register a new member account with email and password authentication.
 * 2. The join operation authenticates the member and sets authorization headers.
 * 3. Retrieve a session using a generated session ID.
 * 4. Validate that the session response structure is correctly formatted with all required fields.
 * 5. Confirm that session data includes member and organization references with proper type validation.
 */
export async function test_api_member_session_retrieve_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Generate a session ID for retrieval
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the session using the authenticated member connection
  const session = await api.functional.hrmTimeTrack.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session structure
  TestValidator.predicate("has valid session ID", session.id.length > 0);
  TestValidator.predicate(
    "has member reference",
    session.member.id !== undefined,
  );
  TestValidator.predicate(
    "has organization reference",
    session.organization.id !== undefined,
  );
  TestValidator.predicate("has IP address", session.ip.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    session.expired_at.length > 0,
  );
  TestValidator.predicate(
    "member has valid email",
    session.member.email.length > 0,
  );
  TestValidator.predicate(
    "organization has valid name",
    session.organization.name.length > 0,
  );
}
