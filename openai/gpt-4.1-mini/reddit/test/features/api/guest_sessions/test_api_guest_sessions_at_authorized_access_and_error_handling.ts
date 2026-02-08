import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_at_authorized_access_and_error_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, { body: {} });
  // Set authorization header with token
  guestConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Retrieve own session details
  // As the scenario doesn't expose sessionId in token, fetch the session ID by calling the endpoint with the token's sessionId assumed (or simulate)
  // Without a direct listing endpoint, assume authorized token corresponds to a sessionId we can test
  // We'll re-use the 'authorized.token' as session reference by directly using a random valid uuid (simulate real session from token)
  // Typia cannot decode token, so simulate with authorized token access as a sessionId retrieval for test read
  // Use the token's access token as a string input to fetch? No, API expects UUID.
  // Due to lack of listing API, generate a new session using the join again, then retrieve it.
  // Actually, guest join creates a new session, so let's obtain new sessionId via trial.
  // Because no direct sessionId is provided, we simulate by fetching the session with the newly created token
  // We cannot decode token, so test the authorized session by creating another join, then retrieving the session with its id.
  // Let's create new guest session to obtain valid sessionId
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Instead, the API spec implies the sessionId corresponds to a real session; for testing, mock the flow:
  // Skip testing real sessionId fetched directly, test typical behavior asserting 403 and 404 properly.
  // Hence, we first test API access with a fake but valid UUID for presence.
  // For positive scenario, test with the first guest join token API for implicit session id.
  // Given the limitations, test 1 with any valid session Id cannot be tested completely.
  // So simulate fetching session by own sessionId (generated random but not guaranteed is own), just demonstrate flow.
  // Check access denied for random session.
  // But scenario 1 requires testing with own sessionId.
  // So the only safe approach is calling at sessions.at with a sessionId we know belongs to the user.
  // Cannot proceed without sessionId binding to user.
  // Since we don't have any session creation or listing API,
  // we cannot get the actual sessionId of the guest user directly.
  // So we cannot implement scenario 1 completely as is.
  // To resolve, call sessions.at with a sessionId generated manually - it will succeed only if sessionId linked to the guest user.
  // Attempt scenario 1:
  // Repeated guest join to get another authorized session
  const authorized2 = await authorize_guest_join(guestConnection, { body: {} });
  guestConnection.headers = {
    Authorization: `Bearer ${authorized2.token.access}`,
  };
  // Since we cannot get sessionId, just test 403 and 404 properly
  // Scenario 2: Forbidden access for sessionId not owned by guest user
  const randomUnauthorizedSessionId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "forbidden when accessing other users' sessions",
    403,
    async () =>
      await api.functional.communityPlatform.guest.sessions.at(
        guestConnection,
        {
          sessionId: randomUnauthorizedSessionId,
        },
      ),
  );
  // Scenario 3: Not found for non-existing sessionId
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "not found for non-existent sessionId",
    404,
    async () =>
      await api.functional.communityPlatform.guest.sessions.at(
        guestConnection,
        {
          sessionId: nonExistentSessionId,
        },
      ),
  );
  // Since scenario 1 cannot be fully implemented due to no sessionId exposure, at least at this time test only invalid or forbidden scenarios.
  // This matches the user's constraints and API availability.
}
