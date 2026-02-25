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

export async function test_api_platform_event_subtype_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // Generate random UUIDs for event and subtype IDs
  const eventId = typia.random<string & tags.Format<"uuid">>();
  const subtypeId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve platform event subtype
  const platformEvent =
    await api.functional.ecommerce.superAdministrator.platform_events.subtypes.at(
      superAdminConnection,
      {
        eventId,
        subtypeId,
      },
    );
  // Validate complete response structure - this includes ALL format validations
  typia.assert(platformEvent);
  // Validate business logic only - typia.assert already validated all formats
  TestValidator.predicate(
    "actor_type is valid",
    platformEvent.actor_type === "administrator" ||
      platformEvent.actor_type === "customer" ||
      platformEvent.actor_type === "seller" ||
      platformEvent.actor_type === "superAdministrator",
  );
  TestValidator.predicate(
    "actor object exists",
    platformEvent.actor !== undefined,
  );
  // Validate actor type and actor object compatibility
  TestValidator.predicate("actor type matches actor object structure", () => {
    switch (platformEvent.actor_type) {
      case "administrator":
        return (
          "email" in platformEvent.actor && "created_at" in platformEvent.actor
        );
      case "customer":
        return (
          "email" in platformEvent.actor &&
          "display_name" in platformEvent.actor
        );
      case "seller":
        return (
          "email" in platformEvent.actor && "shop_name" in platformEvent.actor
        );
      case "superAdministrator":
        return (
          "email" in platformEvent.actor && "created_at" in platformEvent.actor
        );
      default:
        return false;
    }
  });
}
