import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_actor_security_event_deletion_of_already_deleted_or_nonexistent_event(
  connection: api.IConnection,
) {
  // 1. Bootstrap admin context via join so that Authorization is set on connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a concrete actor security event to later delete
  const createBody = {
    actor_type: "admin",
    event_type: "LOGIN_FAILED",
    ip: null,
    user_agent: null,
    metadata: null,
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const createdEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallActorSecurityEvent>(createdEvent);

  // 3. First DELETE should succeed for existing event
  await api.functional.shoppingMall.admin.actorSecurityEvents.erase(
    connection,
    {
      securityEventId: createdEvent.id,
    },
  );

  // 4. Second DELETE on the same id should now fail with some error
  await TestValidator.error(
    "second delete for already removed security event should fail",
    async () => {
      await api.functional.shoppingMall.admin.actorSecurityEvents.erase(
        connection,
        {
          securityEventId: createdEvent.id,
        },
      );
    },
  );

  // 5. DELETE with a clearly unrelated random UUID should also fail
  const randomId = typia.random<string & tags.Format<"uuid">>();

  // Sanity check (not logically necessary, but reinforces that randomId is independent)
  TestValidator.notEquals(
    "random UUID used for non-existent event deletion should differ from created event id",
    createdEvent.id,
    randomId,
  );

  await TestValidator.error(
    "delete for obviously non-existent security event id should fail",
    async () => {
      await api.functional.shoppingMall.admin.actorSecurityEvents.erase(
        connection,
        {
          securityEventId: randomId,
        },
      );
    },
  );
}
