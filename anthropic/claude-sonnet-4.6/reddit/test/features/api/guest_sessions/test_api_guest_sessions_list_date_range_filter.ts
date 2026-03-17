import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import type { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_list_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest identity and get JWT
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestAuth);
  // Step 2: Record timestamp T (right after session creation)
  const T = new Date();
  const tMinus1Min = new Date(T.getTime() - 60 * 1000).toISOString();
  const tPlus1Min = new Date(T.getTime() + 60 * 1000).toISOString();
  const tPlus1Hour = new Date(T.getTime() + 60 * 60 * 1000).toISOString();
  const tMinus1Hour = new Date(T.getTime() - 60 * 60 * 1000).toISOString();
  // Step 3: Query with narrow window around T — should include the newly created session
  const withinRange = await api.functional.community.guest.sessions.index(
    guestConnection,
    {
      body: {
        createdAtFrom: tMinus1Min as string & tags.Format<"date-time">,
        createdAtTo: tPlus1Min as string & tags.Format<"date-time">,
      } satisfies ICommunityMemberSession.IRequest,
    },
  );
  typia.assert(withinRange);
  // Validate structure integrity
  TestValidator.predicate(
    "within-range: pagination present",
    () => withinRange.pagination !== undefined,
  );
  TestValidator.predicate("within-range: data is array", () =>
    Array.isArray(withinRange.data),
  );
  // The newly created session should be in the results (at least 1 record)
  TestValidator.predicate(
    "within-range: newly created session is included",
    () => withinRange.data.length > 0,
  );
  // All returned sessions must have created_at within [tMinus1Min, tPlus1Min]
  for (const session of withinRange.data) {
    const createdAt = new Date(session.created_at).getTime();
    TestValidator.predicate(
      "within-range: session created_at >= createdAtFrom",
      () => createdAt >= new Date(tMinus1Min).getTime(),
    );
    TestValidator.predicate(
      "within-range: session created_at <= createdAtTo",
      () => createdAt <= new Date(tPlus1Min).getTime(),
    );
  }
  // Step 4: Query with future lower bound — should return empty
  const futureFrom = await api.functional.community.guest.sessions.index(
    guestConnection,
    {
      body: {
        createdAtFrom: tPlus1Hour as string & tags.Format<"date-time">,
      } satisfies ICommunityMemberSession.IRequest,
    },
  );
  typia.assert(futureFrom);
  TestValidator.predicate("future-from: data is array", () =>
    Array.isArray(futureFrom.data),
  );
  TestValidator.equals(
    "future-from: data should be empty",
    futureFrom.data.length,
    0,
  );
  TestValidator.equals(
    "future-from: pagination.records should be 0",
    futureFrom.pagination.records,
    0,
  );
  // Step 5: Query with past upper bound — should return empty
  const pastTo = await api.functional.community.guest.sessions.index(
    guestConnection,
    {
      body: {
        createdAtTo: tMinus1Hour as string & tags.Format<"date-time">,
      } satisfies ICommunityMemberSession.IRequest,
    },
  );
  typia.assert(pastTo);
  TestValidator.predicate("past-to: data is array", () =>
    Array.isArray(pastTo.data),
  );
  TestValidator.equals("past-to: data should be empty", pastTo.data.length, 0);
  TestValidator.equals(
    "past-to: pagination.records should be 0",
    pastTo.pagination.records,
    0,
  );
}
