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

export async function test_api_guest_join_server_assisted_ip_context(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test server-assisted guest join with optional IPv4 context.
   *
   * Validates that the public guest onboarding flow accepts the required
   * browsing context together with the optional server-assisted IPv4 address and
   * returns a structurally valid authorization payload.
   *
   * 1. Creates an isolated guest connection from the base connection.
   * 2. Sends a guest join request with valid URI context and an IPv4 address.
   * 3. Confirms the response contains a valid guest authorization payload.
   */
  const guestConnection: api.IConnection = { host: connection.host };
  const output = await authorize_guest_join(guestConnection, {
    body: {
      href: "https://example.com/todo/guest-join",
      referrer: "https://example.com/landing",
      ip: "203.0.113.42",
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(output);
}
