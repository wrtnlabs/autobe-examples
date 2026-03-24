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

export async function test_api_guest_session_retrieve_denied_for_other_guest(
  connection: api.IConnection,
): Promise<void> {
  // guestA join
  const guestAConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestAConnection, {
    body: {
      device_identifier: typia.random<string>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  // guestB join (authenticated as guestB)
  const guestBConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestBConnection, {
    body: {
      device_identifier: typia.random<string>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  const otherSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "guest should not retrieve another guest session",
    async () => {
      const output = await api.functional.todoApp.guest.sessions.at(
        guestBConnection,
        {
          sessionId: otherSessionId,
        },
      );
      typia.assert(output);
    },
  );
}
