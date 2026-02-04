import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_profile_retrieval_by_authenticated_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for seller registration and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Step 2: Create a new connection for profile retrieval using the authenticated headers
  // Using the received connection (sellerConnection) is necessary because authorize_seller_join updated its headers
  // The headers contain the Authorization: Bearer {access_token}
  // This connection is now authenticated and ready for protected endpoint access
  const profileConnection: api.IConnection = { host: connection.host };
  // Copy the headers from the authenticated connection to ensure authorization
  profileConnection.headers = { ...sellerConnection.headers };
  // Step 3: Return the authenticated seller profile
  // The endpoint returns IShoppingMallSeller type which includes:
  // - shop_name (string | null) - not set during join, should be null
  // - approval_status ("pending_approval" | "approved" | "rejected") - "pending_approval" after join
  // - is_suspended (boolean) - false by default
  // - created_at (date-time)
  // - updated_at (date-time)
  const sellerProfile =
    await api.functional.shoppingMall.seller.sellers.me.at(profileConnection);
  typia.assert(sellerProfile);
  // Step 4: Validate profile fields
  // shop_name should be null (not provided during registration)
  TestValidator.equals(
    "shop_name should be null",
    sellerProfile.shop_name,
    null,
  );
  // approval_status should be "pending_approval" (status after join)
  TestValidator.equals(
    "approval_status should be pending_approval",
    sellerProfile.approval_status,
    "pending_approval",
  );
  // is_suspended should be false (account not suspended)
  TestValidator.equals(
    "is_suspended should be false",
    sellerProfile.is_suspended,
    false,
  );
  // created_at and updated_at should be valid date-time strings
  // typia.assert already validates format
  // Since IShoppingMallSeller type does not have an 'id' property, we cannot validate sellerProfile.id
  // We've already validated the sellerAuth.seller_id from the authentication response, but there is no equivalent property in the profile response
}
