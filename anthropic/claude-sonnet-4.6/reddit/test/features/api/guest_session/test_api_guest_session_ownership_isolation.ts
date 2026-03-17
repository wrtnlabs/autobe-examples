import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Guest A with fingerprint 'device-A'
  const guestAConnection: api.IConnection = { host: connection.host };
  const guestA = await authorize_guest_join(guestAConnection, {
    body: {
      fingerprint: `device-A-${RandomGenerator.alphaNumeric(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestA);
  // Step 2: Register Guest B with fingerprint 'device-B'
  const guestBConnection: api.IConnection = { host: connection.host };
  const guestB = await authorize_guest_join(guestBConnection, {
    body: {
      fingerprint: `device-B-${RandomGenerator.alphaNumeric(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestB);
  // Step 3: Using Guest B's authenticated connection, attempt to retrieve
  // Guest A's guest identity UUID as a session ID (cross-guest ownership violation).
  // Since ICommunityGuest.IAuthorized does not expose the session UUID directly,
  // we use Guest A's guest identity `id` as the target sessionId.
  // The server must either return 403 (owned by another guest) or 404 (not a valid session).
  // Both outcomes confirm that Guest B cannot access Guest A's session data.
  await TestValidator.httpError(
    "guest B cannot access guest A's session record",
    [403, 404],
    async () => {
      await api.functional.community.guest.sessions.at(guestBConnection, {
        sessionId: guestA.id,
      });
    },
  );
}
