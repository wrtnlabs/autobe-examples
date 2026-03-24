import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_update_guest_context_privacy_no_member_data_leak(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const forbiddenKeySubstrings = [
    "member",
    "account",
    "email",
    "status",
    "display_name",
    "profile",
    "todo",
    "verification",
    "password",
    "reset",
  ] as const;
  const assertNoForbiddenKeys = (value: unknown) => {
    const seen = new Set<unknown>();
    const walk = (v: unknown) => {
      if (v === null || v === undefined) return;
      if (typeof v !== "object") return;
      if (seen.has(v)) return;
      seen.add(v);
      if (Array.isArray(v)) {
        for (const item of v) walk(item);
        return;
      }
      for (const [k, subv] of Object.entries(v as Record<string, unknown>)) {
        for (const forbidden of forbiddenKeySubstrings) {
          if (k.includes(forbidden)) {
            throw new Error(`Forbidden member-scoped key leaked: ${k}`);
          }
        }
        walk(subv);
      }
    };
    walk(value);
  };
  const doRequest = async (deviceIdentifier: string) => {
    const randomBody = typia.random<ITodoAppGuest.IUpdate>();
    const input = {
      ...randomBody,
      deviceIdentifier,
    } satisfies ITodoAppGuest.IUpdate;
    const response = await api.functional.todoApp.guests.updateGuestContext(
      guestConnection,
      { body: input },
    );
    typia.assert(response);
    assertNoForbiddenKeys(response);
    return response;
  };
  await doRequest(typia.random<string>());
  await doRequest(typia.random<string>());
}
