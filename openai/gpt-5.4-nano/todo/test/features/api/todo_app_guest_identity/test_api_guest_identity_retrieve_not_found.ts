import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_identity_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Seed at least one existing guest identity
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_identifier: typia.random<string>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authorized);
  const existingGuestId = authorized.id;

  // 2) Pick another syntactically valid UUID different from the existing one
  let notExistingGuestId: string & tags.Format<"uuid">;
  do {
    notExistingGuestId = typia.random<string & tags.Format<"uuid">>();
  } while (notExistingGuestId === existingGuestId);

  // 3) Retrieving the non-existent guest identity should throw a not-found error,
  // and should not leak the existingGuestId in the error message.
  await TestValidator.httpError(
    "guest identity not found",
    404,
    async () => {
      try {
        await api.functional.todoApp.guests.at(guestConnection, {
          guestId: notExistingGuestId,
        });
      } catch (e: unknown) {
        if (
          typeof e === "object" &&
          e !== null &&
          "toJSON" in e &&
          typeof (e as { toJSON?: unknown }).toJSON === "function"
        ) {
          const message = (e as {
            toJSON: <T = unknown>() => T;
          }).toJSON<{ message?: unknown }>().message;

          if (typeof message === "string") {
            TestValidator.notEquals(
              "error message should not leak other guest id",
              message,
              expectExistingGuestIdString(existingGuestId),
            );
          }
        }
        throw e;
      }
    },
  );

  // 4) Side-effect check: existing guest should still be retrievable
  const existingGuest = await api.functional.todoApp.guests.at(
    guestConnection,
    { guestId: existingGuestId },
  );
  typia.assert(existingGuest);
  TestValidator.equals(
    "guest id matches seeded identity",
    existingGuest.id,
    existingGuestId,
  );
}
function expectExistingGuestIdString(
  existingGuestId: string & tags.Format<"uuid">,
): string {
  return existingGuestId;
}
