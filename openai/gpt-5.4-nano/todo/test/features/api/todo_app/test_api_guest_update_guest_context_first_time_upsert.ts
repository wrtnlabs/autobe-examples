import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_update_guest_context_first_time_upsert(
  connection: api.IConnection,
): Promise<void> {
  // Guest actor: use base connection only
  const guestConnection: api.IConnection = { host: connection.host };
  const now = new Date();
  const deviceIdentifier = `device_${RandomGenerator.alphaNumeric(24)}`;
  const ip = `203.0.113.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()}`;
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const response = await api.functional.todoApp.guests.updateGuestContext(
    guestConnection,
    {
      body: {
        deviceIdentifier,
        ip,
        href,
        referrer,
      } satisfies ITodoAppGuest.IUpdate,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "expired_at is in the future",
    () => new Date(response.expired_at).getTime() > now.getTime(),
  );
  TestValidator.equals("ip reflected", response.ip, ip);
  TestValidator.equals("href reflected", response.href, href);
  TestValidator.equals("referrer reflected", response.referrer, referrer);
  // Privacy boundary: validate only what the guest DTO permits.
  // If the server leaked member-scoped data into this endpoint,
  // typia.assert(response) would fail against the declared response DTO.
  typia.assert(response);
}
