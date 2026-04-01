import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuest";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      href: "https://example.com/guest/session-entry",
      referrer: "https://example.com/guest/referrer",
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  const session = await api.functional.erpHrmTime.guest.sessions.at(
    guestConnection,
    {
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(session);
  TestValidator.predicate(
    "session member should be populated as a summary object",
    () => typeof session.member === "object" && session.member !== null,
  );
  TestValidator.predicate(
    "session should expose an id",
    () => session.id.length > 0,
  );
  TestValidator.predicate(
    "session should expose an ip",
    () => session.ip.length > 0,
  );
  TestValidator.predicate(
    "session should expose a href",
    () => session.href.length > 0,
  );
  TestValidator.predicate(
    "session should expose a referrer",
    () => session.referrer.length > 0,
  );
  TestValidator.predicate(
    "session should expose created_at",
    () => session.created_at.length > 0,
  );
  TestValidator.predicate(
    "session should expose expired_at",
    () => session.expired_at.length > 0,
  );
}
