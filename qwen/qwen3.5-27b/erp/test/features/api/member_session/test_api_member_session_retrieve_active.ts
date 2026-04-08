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
 * Test retrieving a member session by session ID with proper authentication.
 *
 * Validates the session retrieval endpoint behavior when accessing member session data. The test registers a new member account to establish authentication context, then attempts to retrieve a session by ID. Since session IDs are not exposed in the join response and there's no session listing API, this test validates the endpoint's error handling for non-existent sessions.
 *
 * The test ensures that:
 * - Member registration and authentication work correctly
 * - The session retrieval endpoint is accessible with proper authentication
 * - Appropriate error responses are returned for invalid session IDs
 *
 * 1. Register a new member account using the authorize_member_join utility function.
 * 2. Generate a random UUID to use as a session ID for the retrieval attempt.
 * 3. Call the session retrieval endpoint with the generated session ID.
 * 4. Validate that the endpoint returns an appropriate error for non-existent sessions.
 */
export async function test_api_member_session_retrieve_active(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member
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
  // 2. Generate a random session ID (this session doesn't actually exist)
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the session (expected to fail with 404)
  await TestValidator.httpError(
    "should return 404 for non-existent session",
    404,
    async () =>
      await api.functional.hrmTimeTrack.member.sessions.at(memberConnection, {
        sessionId,
      }),
  );
}
