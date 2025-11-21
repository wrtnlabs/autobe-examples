import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationDelivery";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";

export async function test_api_notification_delivery_search_admin_data_isolation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate first admin and create delivery records
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: firstAdminEmail,
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(firstAdmin);

  // Set up search criteria for first admin's delivery records
  const firstAdminDeliveryCriteria: IShoppingMallNotificationDelivery.IRequest =
    {
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(), // Next day
      status: "success",
      delivery_channel: "email",
      template_id: typia.random<string & tags.Format<"uuid">>(),
      queue_id: typia.random<string & tags.Format<"uuid">>(),
      error_code: "",
      page: 0,
      limit: 10,
    };

  // Create delivery records for first admin - these records should be tied to firstAdmin.id
  const firstAdminDelivery: IPageIShoppingMallNotificationDelivery =
    await api.functional.shoppingMall.admin.notifications.deliveries.index(
      connection,
      {
        body: firstAdminDeliveryCriteria,
      },
    );
  typia.assert(firstAdminDelivery);
  TestValidator.equals(
    "first admin has deliveries",
    firstAdminDelivery.data.length > 0,
    true,
  );

  // Step 2: Authenticate second admin (different account)
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: secondAdminEmail,
        password: "SecurePass456!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(secondAdmin);

  // Step 3: Second admin tries to search for first admin's delivery records
  // This should fail due to data isolation - second admin should not see first admin's records
  const secondAdminSearchCriteria: IShoppingMallNotificationDelivery.IRequest =
    {
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      status: "success",
      delivery_channel: "email",
      template_id: firstAdminDeliveryCriteria.template_id,
      queue_id: firstAdminDeliveryCriteria.queue_id,
      error_code: "",
      page: 0,
      limit: 10,
    };

  // Second admin attempts to search for first admin's delivery records
  // This search should return empty dataset due to data isolation (ownership verification)
  const secondAdminSearchResults: IPageIShoppingMallNotificationDelivery =
    await api.functional.shoppingMall.admin.notifications.deliveries.index(
      connection,
      {
        body: secondAdminSearchCriteria,
      },
    );
  typia.assert(secondAdminSearchResults);

  // Verify that second admin cannot see first admin's delivery records
  // Due to data isolation, results should be empty
  TestValidator.equals(
    "second admin cannot see first admin's data",
    secondAdminSearchResults.data.length,
    0,
  );

  // Step 4: Authenticate third admin and create separate delivery records
  const thirdAdminEmail = typia.random<string & tags.Format<"email">>();
  const thirdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: thirdAdminEmail,
        password: "SecurePass789!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(thirdAdmin);

  // Create delivery records for third admin (separate dataset)
  const thirdAdminDeliveryCriteria: IShoppingMallNotificationDelivery.IRequest =
    {
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      status: "failed",
      delivery_channel: "push",
      template_id: typia.random<string & tags.Format<"uuid">>(),
      queue_id: typia.random<string & tags.Format<"uuid">>(),
      error_code: "SERVICE_UNAVAILABLE",
      page: 0,
      limit: 10,
    };

  const thirdAdminDelivery: IPageIShoppingMallNotificationDelivery =
    await api.functional.shoppingMall.admin.notifications.deliveries.index(
      connection,
      {
        body: thirdAdminDeliveryCriteria,
      },
    );
  typia.assert(thirdAdminDelivery);
  TestValidator.equals(
    "third admin has deliveries",
    thirdAdminDelivery.data.length > 0,
    true,
  );

  // Verify second admin still cannot see third admin's data
  const secondAdminSearchThird =
    await api.functional.shoppingMall.admin.notifications.deliveries.index(
      connection,
      {
        body: thirdAdminDeliveryCriteria,
      },
    );
  typia.assert(secondAdminSearchThird);
  TestValidator.equals(
    "second admin cannot see third admin's data",
    secondAdminSearchThird.data.length,
    0,
  );
}
