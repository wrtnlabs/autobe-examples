import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditMemberSession";
import type { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_expired_sessions_excluded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditGuest.IJoin,
  });
  // 2. Retrieve sessions list
  const result: IPageIRedditMemberSession.ISummary =
    await api.functional.reddit.guest.sessions.index(guestConnection, {
      body: typia.random<IRedditMemberSession.IRequest>(),
    });
  typia.assert(result);
  // 3. Verify all returned sessions are active (expired_at future)
  for (const session of result.data) {
    const expiredAt = new Date(session.expired_at);
    const now = new Date();
    TestValidator.predicate(
      "active session must have future expiration",
      expiredAt > now,
    );
  }
}
