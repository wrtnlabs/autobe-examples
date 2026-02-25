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

export async function test_api_guest_sessions_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IRedditGuest.IJoin,
  });
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sessions = await api.functional.reddit.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at: sevenDaysAgo.toISOString(),
        limit: 100,
      } satisfies IRedditMemberSession.IRequest,
    },
  );
  typia.assert(sessions);
  const validSessions = sessions.data.filter((session) => {
    const sessionDate = new Date(session.created_at);
    return sessionDate >= sevenDaysAgo;
  });
  TestValidator.equals(
    "All sessions within date range",
    validSessions.length,
    sessions.data.length,
  );
  const expectedSessionDates = [...sessions.data]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map((s) => s.created_at);
  const actualSessionDates = sessions.data.map((s) => s.created_at);
  TestValidator.equals(
    "Sessions ordered most recent first",
    actualSessionDates.join(","),
    expectedSessionDates.join(","),
  );
}
