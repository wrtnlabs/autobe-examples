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

export async function test_api_guest_session_correlation_transactionality_no_orphan_session_on_failure(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IErpHrmTimeTrackingGuest.IJoin;
  const authorized = await authorize_guest_join(guestConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  const ip = `203.0.113.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()}`;
  const href = `https://example.com/${RandomGenerator.alphabets(12)}`;
  const referrer = `https://referrer.example.com/${RandomGenerator.alphabets(10)}`;
  const requestBody = {
    email: credentials.email,
    ip,
    href,
    referrer,
  } satisfies IErpHrmTimeTrackingGuestSession.IRequest;
  const first =
    await api.functional.erpHrmTimeTracking.guest.guests.updateGuestSession(
      guestConnection,
      { body: requestBody },
    );
  typia.assert(first);
  const patch1 =
    api.functional.erpHrmTimeTracking.guest.guests.updateGuestSession(
      guestConnection,
      { body: requestBody },
    );
  const patch2 =
    api.functional.erpHrmTimeTracking.guest.guests.updateGuestSession(
      guestConnection,
      { body: requestBody },
    );
  const results = await Promise.allSettled([patch1, patch2]);
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<IErpHrmTimeTrackingGuestSession> =>
      r.status === "fulfilled",
  );
  const rejected = results.filter((r) => r.status === "rejected");
  TestValidator.predicate(
    "at least one request should fail and at least one should succeed",
    () => fulfilled.length >= 1 && rejected.length >= 1,
  );
  if (rejected.length > 0) {
    TestValidator.predicate("failed request should be HttpError", () => {
      const reason = rejected[0]!.reason as unknown;
      if (typeof reason !== "object" || reason === null) return false;
      const r = reason as { status?: unknown; name?: unknown };
      return (
        (typeof r.status === "number" && Number.isFinite(r.status)) ||
        r.name === "HttpError"
      );
    });
  }
  const succeededSession = fulfilled[0]!.value;
  typia.assert(succeededSession);
  const after =
    await api.functional.erpHrmTimeTracking.guest.guests.updateGuestSession(
      guestConnection,
      { body: requestBody },
    );
  typia.assert(after);
  TestValidator.equals("guestId stays the same", after.guestId, first.guestId);
  const after2 =
    await api.functional.erpHrmTimeTracking.guest.guests.updateGuestSession(
      guestConnection,
      { body: requestBody },
    );
  typia.assert(after2);
  TestValidator.equals(
    "subsequent retry keeps guest correlation",
    after2.guestId,
    first.guestId,
  );
  TestValidator.predicate("expiredAt is not earlier than createdAt", () => {
    return after.expiredAt >= after.createdAt;
  });
}
