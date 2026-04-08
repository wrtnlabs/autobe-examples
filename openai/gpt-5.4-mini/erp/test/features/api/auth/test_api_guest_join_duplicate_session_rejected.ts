import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_duplicate_session_rejected(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    href: "https://example.com/guest/join",
    referrer: "https://example.com/landing",
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeGuestSession.IJoin;
  const firstAuthorized = await authorize_guest_join(firstConnection, {
    body: joinBody,
  });
  typia.assert(firstAuthorized);
  const duplicateConnection: api.IConnection = { host: connection.host };
  duplicateConnection.headers = {
    Authorization: firstAuthorized.access,
  };
  await TestValidator.error(
    "duplicate guest join should be rejected",
    async () => {
      await authorize_guest_join(duplicateConnection, {
        body: joinBody,
      });
    },
  );
}
