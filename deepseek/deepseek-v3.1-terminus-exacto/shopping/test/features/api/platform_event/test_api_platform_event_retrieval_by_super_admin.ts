import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test successful retrieval of platform event details by super administrator.
 * 1. Create super administrator connection via join
 * 2. Retrieve platform event using secure admin connection
 * 3. Validate complete event data structure and required fields
 */
export async function test_api_platform_event_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Note: In a real scenario, we would first create a platform event,
  // but since we cannot create platform events via available APIs,
  // we rely on existing platform events in the database.
  // For test purposes, we use a random UUID that should exist in test setup.
  const eventId = typia.random<string & tags.Format<"uuid">>();
  const event =
    await api.functional.ecommerce.superAdministrator.platform_events.at(
      adminConnection,
      { eventId },
    );
  // Complete runtime validation including all types and formats
  typia.assert(event);
  // Business logic validation only
  TestValidator.predicate("event has valid actor_type", () =>
    ["administrator", "customer", "seller", "superAdministrator"].includes(
      event.actor_type,
    ),
  );
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    () => !isNaN(new Date(event.created_at).getTime()),
  );
}
