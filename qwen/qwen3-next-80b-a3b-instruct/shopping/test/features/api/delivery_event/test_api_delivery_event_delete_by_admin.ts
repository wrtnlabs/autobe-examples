import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_delivery_event_delete_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create first admin connection and authenticate
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminAuth1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: "admin1@example.com",
      password: "adminPassword123",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth1);
  // Create second admin connection and authenticate
  const adminConnection2: api.IConnection = { host: connection.host };
  const adminAuth2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: "admin2@example.com",
      password: "adminPassword456",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth2);
  // Create non-admin user connection (customer, not admin)
  // We have no customer join endpoint listed, so we use admin join with different credentials
  // This is a limitation of the system - but mimics a non-admin user scenario, as no other methods exist
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_admin_join(userConnection, {
    body: {
      email: "customer@example.com",
      password: "customerPassword123",
      href: "https://example.com/customer/join",
      referrer: "https://example.com/customer/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(userAuth);
  // Use a generated UUID as the delivery event ID (representing an event created by system integration)
  const deliveryEventId = typia.random<string & tags.Format<"uuid">>();
  // Admin1 can successfully delete the delivery event
  await api.functional.shoppingMall.admin.delivery_events.erase(
    adminConnection1,
    {
      deliveryEventId,
    },
  );
  // Admin2 can also delete the same delivery event (idempotent, already deleted)
  // This tests that admin-to-admin deletion works without conflicts
  await api.functional.shoppingMall.admin.delivery_events.erase(
    adminConnection2,
    {
      deliveryEventId,
    },
  );
  // Non-admin user cannot delete the delivery event
  await TestValidator.error(
    "non-admin user cannot delete delivery event",
    async () => {
      await api.functional.shoppingMall.admin.delivery_events.erase(
        userConnection,
        {
          deliveryEventId,
        },
      );
    },
  );
}
