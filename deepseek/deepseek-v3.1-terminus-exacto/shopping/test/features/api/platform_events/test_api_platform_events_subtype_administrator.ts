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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator retrieval of platform event subtype relationships initiated by another administrator.
 * 1. Create administrator account via join.
 * 2. Retrieve a specific subtype relationship using random event and subtype IDs.
 * 3. Validate response structure, actor type, and administrator details.
 */
export async function test_api_platform_events_subtype_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Generate random event and subtype IDs
  const eventId = typia.random<string & tags.Format<"uuid">>();
  const subtypeId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve platform event subtype relationship
  const subtype =
    await api.functional.ecommerce.administrator.platform_events.subtypes.at(
      adminConnection,
      {
        eventId,
        subtypeId,
      },
    );
  typia.assert(subtype);
  // Validate actor_type is one of allowed values
  const allowedActorTypes = [
    "administrator",
    "customer",
    "seller",
    "superAdministrator",
  ] as const;
  TestValidator.predicate(
    "actor_type must be valid",
    (allowedActorTypes as readonly string[]).includes(subtype.actor_type),
  );
  // Validate actor matches actor_type
  if (subtype.actor_type === "administrator") {
    const actor = subtype.actor as IEcommerceAdministrator.ISummary;
    TestValidator.equals(
      "administrator actor id matches actor_id",
      actor.id,
      subtype.actor_id,
    );
    TestValidator.predicate(
      "administrator email exists",
      typeof actor.email === "string" && actor.email.length > 0,
    );
    TestValidator.predicate(
      "administrator created_at exists",
      typeof actor.created_at === "string" && actor.created_at.length > 0,
    );
  }
  // Validate session metadata if present
  if (subtype.session_id !== null && subtype.session_id !== undefined) {
    TestValidator.predicate(
      "session_id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        subtype.session_id,
      ),
    );
  }
  if (subtype.initiator_ip !== null && subtype.initiator_ip !== undefined) {
    TestValidator.predicate(
      "initiator_ip is IPv4 format",
      /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(
        subtype.initiator_ip,
      ),
    );
  }
  if (subtype.initiator_href !== null && subtype.initiator_href !== undefined) {
    TestValidator.predicate(
      "initiator_href is URI format",
      subtype.initiator_href.startsWith("http") ||
        subtype.initiator_href.startsWith("/"),
    );
  }
  if (
    subtype.initiator_referrer !== null &&
    subtype.initiator_referrer !== undefined
  ) {
    TestValidator.predicate(
      "initiator_referrer is URI format",
      subtype.initiator_referrer.startsWith("http") ||
        subtype.initiator_referrer.startsWith("/"),
    );
  }
  // Validate creation timestamp
  TestValidator.predicate(
    "created_at is ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      subtype.created_at,
    ),
  );
}
