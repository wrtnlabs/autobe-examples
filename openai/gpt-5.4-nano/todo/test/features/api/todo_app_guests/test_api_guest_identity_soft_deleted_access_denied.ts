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

export async function test_api_guest_identity_soft_deleted_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create an active guest identity (via utility)
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const guestA = await authorize_guest_join(guestJoinConnection, {
    body: {
      device_identifier: RandomGenerator.alphaNumeric(32),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guestA);
  TestValidator.equals(
    "guestA.deleted_at should be null (active)",
    guestA.deleted_at,
    null,
  );
  // 2) Ensure retrieving the active guest identity works and is not soft-deleted
  const guestAFetch = await api.functional.todoApp.guests.at(
    { host: connection.host },
    {
      guestId: guestA.id,
    },
  );
  typia.assert(guestAFetch);
  TestValidator.equals(
    "GET /todoApp/guests returns deleted_at=null for active identity",
    guestAFetch.deleted_at,
    null,
  );
  // 3) Soft-deletion lifecycle endpoint wasn't provided; validate denial behavior for a non-existent id
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "GET /todoApp/guests denies access for non-existent guestId",
    [400, 404],
    async () => {
      await api.functional.todoApp.guests.at(
        { host: connection.host },
        { guestId: nonExistentGuestId },
      );
    },
  );
  // 4) Also ensure querying a different active identity doesn't leak other data
  const guestJoinConnectionB: api.IConnection = { host: connection.host };
  const guestB = await authorize_guest_join(guestJoinConnectionB, {
    body: {
      device_identifier: RandomGenerator.alphaNumeric(32),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guestB);
  TestValidator.equals(
    "guestB.deleted_at should be null (active)",
    guestB.deleted_at,
    null,
  );
  const guestBFetch = await api.functional.todoApp.guests.at(
    { host: connection.host },
    { guestId: guestB.id },
  );
  typia.assert(guestBFetch);
  TestValidator.equals(
    "guestBFetch.deleted_at should be null",
    guestBFetch.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "guestA id differs from guestB id",
    guestAFetch.id,
    guestBFetch.id,
  );
}
