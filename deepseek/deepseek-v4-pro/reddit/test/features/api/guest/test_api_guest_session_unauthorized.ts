import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that unauthenticated GET on /communityHub/guest/sessions/{sessionId} returns 401 Unauthorized.
 *
 * Validates that the session detail endpoint enforces authentication by rejecting requests from callers who have not performed guest join. The test uses an arbitrary UUID as the session ID and calls the endpoint with a clean connection bearing no authorization header.
 *
 * 1. Generate an arbitrary UUID as the sessionId.
 * 2. Call GET /communityHub/guest/sessions/{sessionId} without any authentication.
 * 3. Expect an HttpError with status 401 Unauthorized.
 */
export async function test_api_guest_session_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthenticated request should return 401",
    401,
    async () =>
      await api.functional.communityHub.guest.sessions.at(connection, {
        sessionId,
      }),
  );
}
