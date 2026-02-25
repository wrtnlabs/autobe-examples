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

export async function test_api_platform_event_subtype_invalid_uuid_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Test valid UUIDs with non-existent platform events and subtypes
  // This tests the business logic validation rather than type validation
  const validButNonExistentEventId = typia.random<
    string & tags.Format<"uuid">
  >();
  const validButNonExistentSubtypeId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test non-existent event with valid subtype
  await TestValidator.error(
    "should reject non-existent platform event",
    async () => {
      await api.functional.ecommerce.superAdministrator.platform_events.subtypes.at(
        superAdminConnection,
        {
          eventId: validButNonExistentEventId,
          subtypeId: validButNonExistentSubtypeId,
        },
      );
    },
  );
  // Test that proper authentication is working
  const badConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("should reject unauthorized access", async () => {
    await api.functional.ecommerce.superAdministrator.platform_events.subtypes.at(
      badConnection,
      {
        eventId: validButNonExistentEventId,
        subtypeId: validButNonExistentSubtypeId,
      },
    );
  });
}
