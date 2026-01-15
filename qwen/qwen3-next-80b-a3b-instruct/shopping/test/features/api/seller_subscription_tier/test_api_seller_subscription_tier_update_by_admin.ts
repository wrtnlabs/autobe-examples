import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerSubscriptionTier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionTier";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_subscription_tier_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a valid seller ID and tier ID (using UUID format as specified in DTO)
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  const tierId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the seller's subscription tier status to 'active' via admin
  const updatedTier: IShoppingMallSellerSubscriptionTier =
    await api.functional.shoppingMall.admin.sellers.subscription_tiers.update(
      adminConnection,
      {
        sellerId: sellerId,
        tierId: tierId,
        body: {
          status: "active", // Only field allowed in IUpdate
        } satisfies IShoppingMallSellerSubscriptionTier.IUpdate,
      },
    );
  // Step 4: Validate response structure using typia.assert (complete type validation)
  typia.assert(updatedTier);
}
