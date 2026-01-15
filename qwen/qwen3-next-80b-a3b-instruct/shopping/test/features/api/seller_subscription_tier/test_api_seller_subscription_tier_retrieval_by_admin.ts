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

export async function test_api_seller_subscription_tier_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin connection and authenticate via utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  
  // Step 2: Generate random but valid UUIDs for seller and tier
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const tierId = typia.random<string & tags.Format<"uuid">>();
  
  // Step 3: Call the API endpoint being tested with the generated IDs
  const retrievedTier =
    await api.functional.shoppingMall.admin.sellers.subscription_tiers.getBySelleridAndTierid(
      adminConnection,
      {
        sellerId: sellerId,
        tierId: tierId,
      },
    );
  typia.assert(retrievedTier);
  
  // Step 4: Validate the retrieved tier matches IShoppingMallSellerSubscriptionTier schema
  const validStatuses = ["active", "inactive", "trial", "cancelled", "pending_payment"] as const;
  TestValidator.predicate("status is one of the valid values", () =>
    validStatuses.includes(retrievedTier.status)
  );
  TestValidator.predicate("price is positive", () => retrievedTier.price > 0);
  TestValidator.equals(
    "currency is a valid ISO code",
    retrievedTier.currency.length,
    3,
  );
  TestValidator.predicate("start_date is a valid date-time", () => {
    const date = new Date(retrievedTier.start_date);
    return (
      !isNaN(date.getTime()) && date.toISOString() === retrievedTier.start_date
    );
  });
  TestValidator.predicate("end_date is either null or valid date-time", () => {
    if (retrievedTier.end_date === null) return true;
    const date = new Date(retrievedTier.end_date);
    return (
      !isNaN(date.getTime()) && date.toISOString() === retrievedTier.end_date
    );
  });
  TestValidator.equals("id is a valid UUID", retrievedTier.id.length, 36);
}