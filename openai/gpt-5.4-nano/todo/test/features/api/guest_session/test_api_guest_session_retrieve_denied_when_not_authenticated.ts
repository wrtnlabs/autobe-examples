import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieve_denied_when_not_authenticated(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create a real guest session identity (utility bootstraps the guest join flow)
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestConnection, {
    body: undefined,
  });
  typia.assert(guestAuthorized);
  // ITodoAppGuest.IAuthorized does not expose the guest session row id.
  // Use the only guaranteed UUID from the join response to attempt access.
  const sessionId = guestAuthorized.id;
  // 2) Call retrieve endpoint without authorization
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "guest session retrieval should be denied when not authenticated",
    async () => {
      try {
        await api.functional.todoApp.guest.sessions.at(unauthConnection, {
          sessionId,
        });
      } catch (exp) {
        // Avoid missing import by using the SDK-exported HttpError class.
        if (!(exp instanceof api.HttpError)) throw exp;
        const message = exp.message;
        TestValidator.predicate(
          "error message must not leak session details",
          () =>
            !(
              message.includes("created_at") ||
              message.includes("expired_at") ||
              message.includes("href") ||
              message.includes("referrer") ||
              message.includes("ip")
            ),
        );
        TestValidator.predicate(
          "error message must not reveal requested session id existence",
          () => !message.includes(sessionId),
        );
        throw exp;
      }
    },
  );
}
