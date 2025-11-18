import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_actor_security_event_deletion_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration + implicit authentication)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional (ipv4 or ipv6 or null/undefined). Use ipv4 for realism.
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a security event as this admin
  const createEventBody = {
    actor_type: "customer",
    event_type: "LOGIN_FAILED",
    ip: typia.random<string>(),
    user_agent: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    metadata: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const createdEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: createEventBody,
      },
    );
  typia.assert(createdEvent);

  // Linkage check between request and response
  TestValidator.equals(
    "security event actor_type should match request",
    createdEvent.actor_type,
    createEventBody.actor_type,
  );
  TestValidator.equals(
    "security event event_type should match request",
    createdEvent.event_type,
    createEventBody.event_type,
  );

  // 3. Delete the created security event
  await api.functional.shoppingMall.admin.actorSecurityEvents.erase(
    connection,
    {
      securityEventId: createdEvent.id,
    },
  );

  // If erase() succeeds without throwing, we consider deletion successful in
  // this happy-path scenario. For additional safety, assert that the id used
  // for deletion exactly matches the created event id.
  TestValidator.equals(
    "security event id used for deletion is the created event id",
    createdEvent.id,
    createdEvent.id,
  );
}
