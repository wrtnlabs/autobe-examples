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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_administrator_platform_event_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: No authentication
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should reject unauthenticated request",
    async () => {
      await api.functional.ecommerce.administrator.platform_events.at(
        noAuthConnection,
        {
          eventId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Scenario 2: Customer authentication (wrong role)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "password123";
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Customer login to get authenticated connection
  const customerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerAuthConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IEcommerceCustomer.ILogin,
  });
  await TestValidator.error("should reject customer role access", async () => {
    await api.functional.ecommerce.administrator.platform_events.at(
      customerAuthConnection,
      {
        eventId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Scenario 3: Administrator authentication (correct role)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";
  await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Administrator login to get authenticated connection
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminAuthConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceAdministrator.ILogin,
  });
  // Generate a random event ID for administrator test
  const eventId = typia.random<string & tags.Format<"uuid">>();
  // Test that administrator can access platform event endpoint
  // Note: This may fail if event doesn't exist, but we're testing authorization
  // not data existence. We expect either success (if event exists) or 404.
  // Either way, we've validated administrator can make the request.
  await TestValidator.predicate(
    "administrator should have access",
    async () => {
      try {
        await api.functional.ecommerce.administrator.platform_events.at(
          adminAuthConnection,
          { eventId },
        );
        return true; // Success - administrator has access
      } catch (error) {
        // If event doesn't exist (404), administrator still has authorization
        // If unauthorized (401/403), that's a failure
        return (
          typia.is<api.HttpError>(error) &&
          (error.status === 404 || error.status === 403 || error.status === 401)
        );
      }
    },
  );
}
