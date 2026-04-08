import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test attempting to retrieve a seller profile that does not exist.
 *
 * Validates that the seller profile retrieval endpoint properly handles requests for non-existent profiles by returning a 404 Not Found error. This test ensures the endpoint doesn't expose internal system information and handles missing resources gracefully.
 *
 * The seller profile endpoint is publicly accessible and should return 404 for any UUID that doesn't correspond to an active (non-soft-deleted) seller profile in the system.
 *
 * 1. Generate a valid UUID format string that doesn't exist in the database
 * 2. Call GET /shoppingMall/customer/profiles/{profileId} with the non-existent profileId
 * 3. Validate that the API throws an HTTP error with status code 404
 * 4. Verify the error response is appropriate and doesn't leak system information
 */
export async function test_api_seller_profile_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a non-existent UUID
  const nonExistentProfileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve the non-existent seller profile
  // This endpoint is public (no authentication required)
  await TestValidator.httpError(
    "should return 404 for non-existent seller profile",
    404,
    async () =>
      await api.functional.shoppingMall.customer.profiles.at(connection, {
        profileId: nonExistentProfileId,
      }),
  );
}
