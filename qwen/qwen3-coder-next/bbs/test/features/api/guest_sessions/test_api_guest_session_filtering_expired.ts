import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_filtering_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication - create initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address:
        `${RandomGenerator.pick([192, 10, 172])}.${RandomGenerator.pick([168, 0, 1])}.${RandomGenerator.pick([1, 2])}.${RandomGenerator.pick([1, 254])}` as string &
          tags.Format<"ipv4">,
    },
  });
  typia.assert(guestSession);
  // 2. Call sessions endpoint with the guest connection
  // The system should automatically filter out expired sessions based on expired_at timestamp
  const sessionsResponse =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {},
    });
  typia.assert(sessionsResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination exists",
    sessionsResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(sessionsResponse.data),
  );
  // 4. Verify automatic filtering: all returned sessions should have future expiration times
  for (const session of sessionsResponse.data) {
    const sessionExpiredAt = new Date(session.expiredAt).getTime();
    const now = Date.now();
    TestValidator.predicate("session not expired", sessionExpiredAt > now);
  }
  // 5. Validate pagination structure
  TestValidator.equals(
    "pagination current is number",
    typeof sessionsResponse.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof sessionsResponse.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is number",
    typeof sessionsResponse.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof sessionsResponse.pagination.pages,
    "number",
  );
  // 6. Verify pagination values are non-negative
  TestValidator.predicate(
    "pagination current >= 0",
    sessionsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    sessionsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    sessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    sessionsResponse.pagination.pages >= 0,
  );
}
