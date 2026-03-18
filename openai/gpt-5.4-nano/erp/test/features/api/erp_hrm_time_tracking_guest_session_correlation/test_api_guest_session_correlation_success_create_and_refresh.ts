import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuest";
import type { IErpHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_correlation_success_create_and_refresh(
  connection: api.IConnection,
): Promise<void> {
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = "p@ssw0rd-Guest" as string & tags.Format<"password">;
  // 1) Guest join to obtain guest identity (authorized guest context)
  const joinConnection: api.IConnection = { host: connection.host };
  const join = await authorize_guest_join(joinConnection, {
    body: {
      email: guestEmail,
      password: guestPassword,
    } satisfies IErpHrmTimeTrackingGuest.IJoin,
  });
  typia.assert(join);
  // 2) Prepare guest-scoped connection for subsequent calls
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers ??= {};
  guestConnection.headers.Authorization = join.token.access;
  const href1 = "https://example.com/guest/session" satisfies string &
    tags.Format<"uri">;
  const referrer1 = "https://example.com/landing";
  const ip1 =
    "203.0.113." +
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
    >();
  const now = Date.now();
  // 3) Upsert correlation
  const correlation1 =
    await api.functional.erpHrmTimeTracking.guest.guests.updateGuestSession(
      guestConnection,
      {
        body: {
          email: guestEmail,
          ip: ip1,
          href: href1,
          referrer: referrer1,
        } satisfies IErpHrmTimeTrackingGuestSession.IRequest,
      },
    );
  typia.assert(correlation1);
  TestValidator.equals(
    "guestId matches join id",
    correlation1.guestId,
    join.id,
  );
  TestValidator.equals("ip matches", correlation1.ip, ip1);
  TestValidator.equals("href matches", correlation1.href, href1);
  TestValidator.equals("referrer matches", correlation1.referrer, referrer1);
  TestValidator.predicate("id is non-empty", correlation1.id.length > 0);
  const createdAt1 = new Date(correlation1.createdAt).getTime();
  TestValidator.predicate("createdAt <= now", createdAt1 <= now);
  const expiredAt1 = new Date(correlation1.expiredAt).getTime();
  TestValidator.predicate("expiredAt > createdAt", expiredAt1 > createdAt1);
  // 4) Upsert again with new connection context
  const href2 = "https://example.com/guest/session/refresh" satisfies string &
    tags.Format<"uri">;
  const referrer2 = "https://example.com/refreshed";
  const ip2 =
    "198.51.100." +
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
    >();
  const correlation2 =
    await api.functional.erpHrmTimeTracking.guest.guests.updateGuestSession(
      guestConnection,
      {
        body: {
          email: guestEmail,
          ip: ip2,
          href: href2,
          referrer: referrer2,
        } satisfies IErpHrmTimeTrackingGuestSession.IRequest,
      },
    );
  typia.assert(correlation2);
  TestValidator.notEquals(
    "correlation record id should differ",
    correlation1.id,
    correlation2.id,
  );
  TestValidator.equals("ip updated", correlation2.ip, ip2);
  TestValidator.equals("href updated", correlation2.href, href2);
  TestValidator.equals("referrer updated", correlation2.referrer, referrer2);
  TestValidator.equals("guestId stable", correlation2.guestId, join.id);
  const createdAt2 = new Date(correlation2.createdAt).getTime();
  TestValidator.predicate("createdAt2 <= now", createdAt2 <= now);
  const expiredAt2 = new Date(correlation2.expiredAt).getTime();
  TestValidator.predicate("expiredAt2 > createdAt2", expiredAt2 > createdAt2);
}
