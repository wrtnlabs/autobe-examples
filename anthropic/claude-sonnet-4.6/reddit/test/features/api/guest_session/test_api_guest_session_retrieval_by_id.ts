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

export async function test_api_guest_session_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest-specific connection and authorize via guest join
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Extract the guest id from the authorized response.
  // The ICommunityGuest.IAuthorized.id is the only UUID available from join.
  // We use it as the sessionId to attempt retrieval.
  const sessionId = authorized.id;
  // 3. Retrieve the guest session by its ID
  const session = await api.functional.community.guest.sessions.at(
    guestConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate the session ID matches the requested one
  TestValidator.equals("session id matches requested", session.id, sessionId);
  // 5. Validate access_token and refresh_token are non-empty
  TestValidator.predicate(
    "access_token is non-empty",
    session.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token is non-empty",
    session.refresh_token.length > 0,
  );
  // 6. Validate expired_at is in the future (session was just created)
  const now = new Date();
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
}
