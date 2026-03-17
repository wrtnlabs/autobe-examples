import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_list_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection with specific metadata for filtering
  const guestConnection: api.IConnection = { host: connection.host };
  const ipPrefix = "192.168";
  const octet1 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
  >() satisfies number as number;
  const octet2 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
  >() satisfies number as number;
  const specificIp = `${ipPrefix}.${octet1}.${octet2}`;
  const specificHref = `https://example.com/guest-auth-${RandomGenerator.alphaNumeric(8)}`;
  const specificReferrer = "https://referrer.com/landing-page";
  await authorize_guest_join(guestConnection, {
    body: {
      href: specificHref,
      referrer: specificReferrer,
      ip: specificIp,
    },
  });
  // Create another guest session with different metadata for negative testing
  const anotherGuestConnection: api.IConnection = { host: connection.host };
  const dOctet1 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
  >() satisfies number as number;
  const dOctet2 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
  >() satisfies number as number;
  const differentIp = `10.0.${dOctet1}.${dOctet2}`;
  const differentHref = `https://different-site.com/page-${RandomGenerator.alphaNumeric(8)}`;
  await authorize_guest_join(anotherGuestConnection, {
    body: {
      href: differentHref,
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: differentIp,
    },
  });
  // Query all sessions without filters
  const allSessions = await api.functional.multiUserTodo.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IMultiUserTodoMemberSession.IRequest,
    },
  );
  typia.assert(allSessions);
  TestValidator.predicate(
    "should have multiple sessions",
    allSessions.pagination.records >= 2,
  );
  // Test 1: Filter by IP address (partial match - prefix)
  const ipFilteredResult =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        ip: ipPrefix,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(ipFilteredResult);
  TestValidator.predicate(
    "IP filter should return at least one session",
    ipFilteredResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all sessions should contain IP prefix",
    ipFilteredResult.data.every((session) => session.ip.includes(ipPrefix)),
  );
  // Test 2: Filter by href URL pattern
  const hrefFilteredResult =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        href: "example.com/guest-auth",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(hrefFilteredResult);
  TestValidator.predicate(
    "href filter should return at least one session",
    hrefFilteredResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all sessions should contain href pattern",
    hrefFilteredResult.data.every((session) =>
      session.href.includes("example.com/guest-auth"),
    ),
  );
  // Test 3: Filter by referrer URL pattern
  const referrerFilteredResult =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        referrer: "referrer.com",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(referrerFilteredResult);
  TestValidator.predicate(
    "referrer filter should return at least one session",
    referrerFilteredResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all sessions should contain referrer pattern",
    referrerFilteredResult.data.every((session) =>
      session.referrer.includes("referrer.com"),
    ),
  );
  // Test 4: Filter by creation date range (recent sessions)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const dateFilteredResult =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        createdAtFrom: oneHourAgo.toISOString(),
        createdAtTo: oneHourLater.toISOString(),
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(dateFilteredResult);
  TestValidator.predicate(
    "date range filter should return sessions",
    dateFilteredResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all sessions should be within date range",
    dateFilteredResult.data.every((session) => {
      const createdAt = new Date(session.createdAt).getTime();
      return (
        createdAt >= oneHourAgo.getTime() && createdAt <= oneHourLater.getTime()
      );
    }),
  );
  // Test 5: Combined filters (IP + href)
  const combinedFilteredResult =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        ip: specificIp,
        href: "example.com/guest-auth",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(combinedFilteredResult);
  TestValidator.predicate(
    "combined filter should return at least one session",
    combinedFilteredResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all sessions should match IP filter",
    combinedFilteredResult.data.every((session) => session.ip === specificIp),
  );
  TestValidator.predicate(
    "all sessions should match href filter",
    combinedFilteredResult.data.every((session) =>
      session.href.includes("example.com/guest-auth"),
    ),
  );
}
