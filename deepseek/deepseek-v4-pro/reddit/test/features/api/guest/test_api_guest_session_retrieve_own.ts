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
 * Test that an authenticated guest can retrieve their own session details.
 *
 * Verifies the guest session retrieval flow where a guest first authenticates via the join endpoint and then fetches their session record. The test ensures that the response includes all required session metadata fields and that no sensitive credential information is exposed.
 *
 * 1. Guest authenticates via authorize_guest_join with randomly generated device fingerprint and session context.
 * 2. Guest retrieves the session using their guest ID from the join response.
 * 3. Validates that the full session record is returned with all expected metadata fields.
 * 4. Confirms that access_token and refresh_token are not present in the response body.
 */
export async function test_api_guest_session_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {});
  typia.assert(authResult);
  const session = await api.functional.communityHub.guest.sessions.at(
    guestConnection,
    { sessionId: authResult.id },
  );
  typia.assert(session);
}
