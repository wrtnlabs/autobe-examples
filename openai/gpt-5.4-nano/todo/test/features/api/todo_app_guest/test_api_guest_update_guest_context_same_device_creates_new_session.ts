import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_update_guest_context_same_device_creates_new_session(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceIdentifier = `device_${RandomGenerator.alphaNumeric(12)}`;
  const firstIp = `192.168.0.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`;
  const firstHref = `https://example.com/${RandomGenerator.alphaNumeric(8)}`;
  const firstReferrer = `https://ref.example.com/${RandomGenerator.alphaNumeric(8)}`;
  const secondIp = `10.0.0.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`;
  const secondHref = `https://example.com/${RandomGenerator.alphaNumeric(8)}`;
  const secondReferrer = `https://ref.example.com/${RandomGenerator.alphaNumeric(8)}`;
  const body1 = {
    deviceIdentifier,
    ip: firstIp,
    href: firstHref,
    referrer: firstReferrer,
  } satisfies ITodoAppGuest.IUpdate;
  const session1 = await api.functional.todoApp.guests.updateGuestContext(
    guestConnection,
    { body: body1 },
  );
  typia.assert(session1);
  const guestSummary1 = session1.guest;
  const sessionId1 = session1.id;
  const expiredAt1 = session1.expired_at;
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
  const body2 = {
    deviceIdentifier,
    ip: secondIp,
    href: secondHref,
    referrer: secondReferrer,
  } satisfies ITodoAppGuest.IUpdate;
  const session2 = await api.functional.todoApp.guests.updateGuestContext(
    guestConnection,
    { body: body2 },
  );
  typia.assert(session2);
  const guestSummary2 = session2.guest;
  const sessionId2 = session2.id;
  const expiredAt2 = session2.expired_at;
  TestValidator.equals("guest summary matches", guestSummary2, guestSummary1);
  TestValidator.notEquals("session id differs", sessionId1, sessionId2);
  TestValidator.equals("ip updated", session2.ip, secondIp);
  TestValidator.equals("href updated", session2.href, secondHref);
  TestValidator.equals("referrer updated", session2.referrer, secondReferrer);
  const expired1 = new Date(expiredAt1).getTime();
  const expired2 = new Date(expiredAt2).getTime();
  const now = Date.now();
  TestValidator.predicate("expired_at is future", expired2 > now);
  TestValidator.predicate("expired_at extended or reset", expired2 >= expired1);
}
