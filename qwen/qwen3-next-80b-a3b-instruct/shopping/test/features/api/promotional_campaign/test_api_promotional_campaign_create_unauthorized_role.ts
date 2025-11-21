import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_create_unauthorized_role(
  connection: api.IConnection,
) {
  // Create admin authentication context first
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin", // Use one of the allowed roles
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Create a new unauthenticated connection (empty headers)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt to create promotional campaign with unauthenticated connection
  await TestValidator.error(
    "unauthenticated request should be rejected with 403 Forbidden",
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
        unauthConn,
        {
          body: "Campaign configuration data" satisfies IShoppingMallPromotionalCampaign.ICreate,
        },
      );
    },
  );
}
