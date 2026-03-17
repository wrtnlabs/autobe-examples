import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieve_expired_record(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const join = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const authorized = typia.assert<ICommunityPlatformGuest.IAuthorized>(join);
  const authorizationBefore = guestConnection.headers?.Authorization;
  await TestValidator.error(
    "guest identity id is not accepted as a guest session lookup or refresh surrogate",
    async () => {
      await api.functional.communityPlatform.guestSessions.at(guestConnection, {
        guestSessionId: authorized.id,
      });
    },
  );
  TestValidator.equals(
    "read failure does not replace guest authorization header",
    guestConnection.headers?.Authorization,
    authorizationBefore,
  );
  TestValidator.equals(
    "guest authorization remains tied to the joined guest identity",
    authorized.id,
    authorized.id,
  );
  TestValidator.equals(
    "guest continuity key remains unchanged after failed session lookup",
    authorized.guest_key,
    authorized.guest_key,
  );
}
