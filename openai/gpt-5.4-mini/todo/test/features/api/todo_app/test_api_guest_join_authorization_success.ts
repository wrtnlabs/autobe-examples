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

/**
 * Verify public guest join authorization success.
 *
 * Validates that an unauthenticated visitor can complete the guest onboarding
 * flow using only transient page context and receive a guest identity together
 * with a full authorization token payload.
 *
 * This test checks the public join path, confirming no existing account or
 * session is required and that the returned tokens are suitable for continuing
 * into the private todo app.
 *
 * 1. Create an isolated guest connection from the base connection.
 * 2. Send a valid guest join request through the guest authorization utility.
 * 3. Assert the returned authorized payload is structurally valid.
 */
export async function test_api_guest_join_authorization_success(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const output = await authorize_guest_join(guestConnection, {
    body: {
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://referrer.example.com/${RandomGenerator.alphabets(8)}`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(output);
}
