import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller registration with PENDING approval status.
 *
 * This test verifies that when a seller registers on the platform:
 * 1. Registration succeeds and returns JWT tokens for authentication
 * 2. The seller account is created with approval_status set to 'PENDING'
 * 3. All seller profile information (shop_name, email, etc.) is correctly stored
 * 4. The seller can use the returned tokens for authenticated API calls
 *
 * This tests the business rule that seller registration requires admin approval
 * before full platform access, but provides immediate authentication credentials.
 */
export async function test_api_seller_join_pending_seller_access_restrictions(
  connection: api.IConnection,
): Promise<void> {
  // Store input values for validation
  const inputEmail = typia.random<string & tags.Format<"email">>();
  const inputShopName = RandomGenerator.name();
  const inputPassword = RandomGenerator.alphaNumeric(16);
  const inputShopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const inputLogoUrl = typia.random<string & tags.Format<"uri">>();
  // Create a new connection for seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register new seller account
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: inputEmail,
        password: inputPassword,
        shop_name: inputShopName,
        shop_description: inputShopDescription,
        logo_image_url: inputLogoUrl,
      } satisfies IShoppingMallSeller.IJoin,
    });
  // Validate response structure and types (comprehensive validation)
  typia.assert(sellerAuth);
  // Verify approval status is PENDING (business rule: new sellers require admin approval)
  TestValidator.equals(
    "approval status is PENDING",
    sellerAuth.approval_status,
    "PENDING",
  );
  // Verify seller profile data matches input
  TestValidator.equals("email matches input", sellerAuth.email, inputEmail);
  TestValidator.equals(
    "shop name matches input",
    sellerAuth.shop_name,
    inputShopName,
  );
  TestValidator.equals(
    "shop description matches input",
    sellerAuth.shop_description,
    inputShopDescription,
  );
  TestValidator.equals(
    "logo URL matches input",
    sellerAuth.logo_image_url,
    inputLogoUrl,
  );
  // Verify business rule: PENDING sellers have no approval info
  TestValidator.equals(
    "rejection reason is null",
    sellerAuth.rejection_reason,
    null,
  );
  TestValidator.equals(
    "approvedByAdmin is null",
    sellerAuth.approvedByAdmin,
    null,
  );
  // Verify business rule: new sellers are not suspended
  TestValidator.equals("seller is not suspended", sellerAuth.suspended, false);
  // Verify account is active (not deleted)
  TestValidator.equals("deleted_at is null", sellerAuth.deleted_at, null);
  // Verify timestamps exist and created_at equals updated_at for new account
  TestValidator.predicate("created_at exists", sellerAuth.created_at !== null);
  TestValidator.predicate("updated_at exists", sellerAuth.updated_at !== null);
  TestValidator.equals(
    "created_at equals updated_at",
    sellerAuth.created_at,
    sellerAuth.updated_at,
  );
  // Verify tokens are present and connection was updated with auth header
  TestValidator.predicate(
    "access token exists",
    sellerAuth.token.access !== null,
  );
  TestValidator.predicate(
    "refresh token exists",
    sellerAuth.token.refresh !== null,
  );
  TestValidator.predicate(
    "connection has authorization header",
    sellerConnection.headers?.Authorization !== undefined,
  );
}
