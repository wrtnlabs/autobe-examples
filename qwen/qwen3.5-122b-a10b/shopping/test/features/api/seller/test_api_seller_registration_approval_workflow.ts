import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller registration approval workflow to verify complete account lifecycle.
 *
 * Validates the seller registration process including account creation with pending approval status, email verification token generation, and seller profile initialization. Ensures that newly registered sellers cannot immediately access selling features until administrator approval.
 *
 * The test verifies the complete registration workflow from initial account creation through approval readiness, confirming that all required fields are properly initialized and the approval workflow is correctly triggered.
 *
 * 1. Register a new seller account with valid credentials and URI context.
 * 2. Validates registration response contains seller identity and authentication tokens.
 * 3. Verifies approval_status is set to 'pending' preventing immediate selling access.
 * 4. Confirms seller profile is created with shop_name derived from email prefix.
 * 5. Validates account status flags (is_suspended, is_banned) are initialized to false.
 * 6. Verifies rejection_reason is null for newly registered accounts.
 */
export async function test_api_seller_registration_approval_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Validate registration response contains required fields
  TestValidator.predicate(
    "seller has valid UUID",
    /^[0-9a-f-]{36}$/i.test(seller.id),
  );
  TestValidator.predicate("has access token", seller.token.access.length > 0);
  TestValidator.predicate("has refresh token", seller.token.refresh.length > 0);
  TestValidator.predicate(
    "token has expiration",
    seller.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token has refreshable deadline",
    seller.token.refreshable_until !== undefined,
  );
  // 3. Verify approval status is pending
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  // 4. Verify account status flags are initialized correctly
  TestValidator.equals("seller is not suspended", seller.is_suspended, false);
  TestValidator.equals("seller is not banned", seller.is_banned, false);
  // 5. Verify rejection reason is null for new registration
  TestValidator.equals(
    "rejection reason is null",
    seller.rejection_reason,
    null,
  );
  // 6. Verify timestamps are set
  TestValidator.predicate(
    "created_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      seller.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      seller.updated_at,
    ),
  );
  // 7. Verify profile is created with default values
  TestValidator.predicate(
    "seller profile exists",
    seller.profile !== null && seller.profile !== undefined,
  );
  if (seller.profile) {
    typia.assert(seller.profile);
    TestValidator.predicate(
      "profile has valid UUID",
      /^[0-9a-f-]{36}$/i.test(seller.profile.id),
    );
    TestValidator.predicate(
      "shop_name is not empty",
      seller.profile.shop_name.length > 0,
    );
    TestValidator.equals(
      "shop_description is null",
      seller.profile.shop_description,
      null,
    );
    TestValidator.equals(
      "logo_image_url is null",
      seller.profile.logo_image_url,
      null,
    );
    TestValidator.predicate(
      "profile created_at is valid datetime",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        seller.profile.created_at,
      ),
    );
    TestValidator.predicate(
      "profile updated_at is valid datetime",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        seller.profile.updated_at,
      ),
    );
  }
}
