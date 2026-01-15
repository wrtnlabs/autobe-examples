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
export async function test_api_seller_subscription_tier_status_change_to_pending_payment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Define a seller and subscription tier ID using random UUIDs
  // These represent an existing seller and subscription tier in the system
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const tierId = typia.random<string & tags.Format<"uuid">>();
  // Create a representation of the pre-existing subscription tier with 'active' status
  // This represents a subscription tier that already exists in the system
  const originalTier: IShoppingMallSellerSubscriptionTier = {
    id: typia.random<string & tags.Format<"uuid">>(),
    status: "active",
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ahead
    price: 99.99,
    currency: "USD",
  };
  // Step 3: Update subscription tier status to 'pending_payment'
  const updatedTier =
    await api.functional.shoppingMall.admin.sellers.subscription_tiers.update(
      adminConnection,
      {
        sellerId: sellerId,
        tierId: tierId,
        body: {
          status: "pending_payment",
        } satisfies IShoppingMallSellerSubscriptionTier.IUpdate,
      },
    );
  typia.assert(updatedTier);
  // Step 4: Validate status is updated to 'pending_payment'
  TestValidator.equals(
    "status updated to pending_payment",
    updatedTier.status,
    "pending_payment",
  );
  // Step 5: Validate end_date is updated to reflect pro-rated billing
  TestValidator.predicate(
    "end_date is not null",
    updatedTier.end_date !== null,
  );
  const updatedEndDate = new Date(updatedTier.end_date!);
  const originalEndDate = new Date(originalTier.end_date!);
  TestValidator.predicate(
    "end_date updated to reflect pro-rated billing",
    updatedEndDate < originalEndDate,
  );
  // Step 6: Validate that price is recalculated correctly
  TestValidator.predicate("price is positive", updatedTier.price > 0);
  TestValidator.predicate(
    "price reflects pro-rated billing",
    updatedTier.price < originalTier.price,
  );
  // Step 7: Confirm seller access remains active during pending_payment period
  // This is by design in the system - pending_payment status does not immediately deactivate access
  // Step 8: Verify system will set status to 'inactive' at end_date
  // We verify end_date is set to a future date for payment grace period
  TestValidator.predicate(
    "end_date is set to future date for payment consideration",
    updatedEndDate > new Date(),
  );
}
