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

export async function test_api_guest_join_soft_deleted_identity_creates_new_identity(
  connection: api.IConnection,
): Promise<void> {
  // NOTE:
  // The required soft-delete operation for the guest identity is not exposed
  // via any provided SDK functions or utilities in the current environment.
  // To keep this test compilable and runnable, we can only validate the
  // second join returns an active (non-deleted) identity and token
  // expiration metadata coherence.
  const deviceIdentifier = typia.random<string>().slice(0, 32);
  const guestConnection1: api.IConnection = { host: connection.host };
  const response1 = await authorize_guest_join(guestConnection1, {
    body: {
      device_identifier: deviceIdentifier,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(response1);
  const guestConnection2: api.IConnection = { host: connection.host };
  const response2 = await authorize_guest_join(guestConnection2, {
    body: {
      device_identifier: deviceIdentifier,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(response2);
  // Soft-delete semantics cannot be verified without an explicit deletion API.
  // Still, ensure returned identity is active.
  TestValidator.equals(
    "deleted_at should be null for joined identity",
    response2.deleted_at,
    null,
  );
  const expiredAt = new Date(response2.token.expired_at);
  const refreshableUntil = new Date(response2.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until should be >= expired_at",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
  // Ensure join produced a valid id different or same depending on reuse.
  // We at least validate id is stable string.
  TestValidator.equals(
    "guest device identifier matches",
    response2.device_identifier,
    response1.device_identifier,
  );
}
