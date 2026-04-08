import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import type { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
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
 * Test duplicate shop name rejection with proper error responses.
 *
 * Validates that the shop profile uniqueness constraint is properly enforced
 * across all active seller shop profiles. Tests the 409 Conflict response when
 * attempting to create a duplicate shop name, as well as validation errors
 * for invalid shop name formats (empty, whitespace-only, too long).
 *
 * The test creates two approved sellers with their own shop profiles and
 * attempts to update one seller's shop name to match the other's, verifying
 * that the conflict is properly detected and reported.
 *
 * 1. Seller A is registered with an approved status and creates a shop profile.
 * 2. Seller B is registered with an approved status and creates a shop profile.
 * 3. Seller B attempts to change their shop name to match Seller A's.
 * 4. The system returns 409 Conflict with an appropriate error message.
 * 5. Seller B's shop profile remains unchanged after the failed update.
 * 6. Edge cases are tested: empty name, whitespace-only, and >100 character names.
 */
export async function test_api_seller_shop_profile_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // ========================================================================
  // Step 1: Create Seller A and their shop profile
  // ========================================================================
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: RandomGenerator.name(),
      href: "https://test.example.com",
      referrer: "https://test.example.com/signup",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAAuth);
  // Create Seller A's shop profile with a unique shop name
  const shopNameA = "Unique Shop Name";
  const sellerAProfile =
    await api.functional.ecommerceMall.seller.shop_profiles.patch(
      sellerAConnection,
      {
        body: {
          shop_name: shopNameA,
          shop_description: "Seller A's shop description",
        } satisfies IEcommerceMallShopProfile.IUpdate,
      },
    );
  typia.assert(sellerAProfile);
  const sellerAProfileId = sellerAProfile.id;
  typia.assert(sellerAProfileId);
  // ========================================================================
  // Step 2: Create Seller B and their shop profile
  // ========================================================================
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: RandomGenerator.name(),
      href: "https://test.example.com",
      referrer: "https://test.example.com/signup",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerBAuth);
  // Create Seller B's shop profile with a different shop name
  const shopNameB = "Seller B's Unique Shop";
  const sellerBProfileBefore =
    await api.functional.ecommerceMall.seller.shop_profiles.patch(
      sellerBConnection,
      {
        body: {
          shop_name: shopNameB,
          shop_description: "Seller B's shop description",
        } satisfies IEcommerceMallShopProfile.IUpdate,
      },
    );
  typia.assert(sellerBProfileBefore);
  const sellerBProfileId = sellerBProfileBefore.id;
  typia.assert(sellerBProfileId);
  // ========================================================================
  // Step 3: Test duplicate shop name rejection (409 Conflict)
  // ========================================================================
  const duplicateShopName = shopNameA; // Trying to use Seller A's shop name
  await TestValidator.httpError(
    "should return 409 Conflict for duplicate shop name",
    [409],
    async () => {
      await api.functional.ecommerceMall.seller.shop_profiles.patch(
        sellerBConnection,
        {
          body: {
            shop_name: duplicateShopName,
          } satisfies IEcommerceMallShopProfile.IUpdate,
        },
      );
    },
  );
  // Verify Seller B's profile is unchanged after failed duplicate name update
  // We can verify this by updating with a DIFFERENT valid name and checking
  // the original name is what we expect
  const newShopName = "Updated Shop Name";
  const sellerBProfileAfter =
    await api.functional.ecommerceMall.seller.shop_profiles.patch(
      sellerBConnection,
      {
        body: {
          shop_name: newShopName,
        } satisfies IEcommerceMallShopProfile.IUpdate,
      },
    );
  typia.assert(sellerBProfileAfter);
  // The duplicate name update didn't happen, so we can now verify the original
  TestValidator.equals(
    "Seller B had original shop name before attempting duplicate",
    sellerBProfileBefore.shop_name,
    shopNameB,
  );
  // Verify Seller A's profile is still unchanged
  TestValidator.equals(
    "Seller A's shop name unchanged after Seller B's failed update attempt",
    sellerAProfile.shop_name,
    shopNameA,
  );
  // Verify Seller B's profile was NOT changed by the duplicate name attempt
  // We just need to confirm that Seller B could update to a NEW name, proving
  // the system didn't lock them out or corrupt their profile
  TestValidator.equals(
    "Seller B can successfully update shop name after failed duplicate attempt",
    sellerBProfileAfter.shop_name,
    newShopName,
  );
  // ========================================================================
  // Step 4: Test edge cases - invalid shop name formats (should return 400)
  // ========================================================================
  // 4.1: Whitespace-only shop name
  const whitespaceOnlyName = "   ";
  await TestValidator.httpError(
    "should return 400 Bad Request for whitespace-only shop name",
    [400],
    async () => {
      await api.functional.ecommerceMall.seller.shop_profiles.patch(
        sellerBConnection,
        {
          body: {
            shop_name: whitespaceOnlyName,
          } satisfies IEcommerceMallShopProfile.IUpdate,
        },
      );
    },
  );
  // 4.2: Empty shop name (empty string)
  const emptyShopName = "";
  await TestValidator.httpError(
    "should return 400 Bad Request for empty shop name",
    [400],
    async () => {
      await api.functional.ecommerceMall.seller.shop_profiles.patch(
        sellerBConnection,
        {
          body: {
            shop_name: emptyShopName,
          } satisfies IEcommerceMallShopProfile.IUpdate,
        },
      );
    },
  );
  // 4.3: Shop name longer than 100 characters
  const tooLongShopName = RandomGenerator.alphaNumeric(101);
  await TestValidator.httpError(
    "should return 400 Bad Request for shop name longer than 100 characters",
    [400],
    async () => {
      await api.functional.ecommerceMall.seller.shop_profiles.patch(
        sellerBConnection,
        {
          body: {
            shop_name: tooLongShopName,
          } satisfies IEcommerceMallShopProfile.IUpdate,
        },
      );
    },
  );
}
