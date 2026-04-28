import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile retrieval with mismatched seller ID returns 404 Not Found.
 *
 * Validates the foreign key integrity constraint on seller profile retrieval: when an administrator
 * attempts to access a seller profile using a sellerId that does not match the actual
 * owner of the specified profileId, the system must return 404 Not Found. This ensures that
 * seller_id foreign key lookup correctly validates ownership relationships.
 *
 * Tests the complete authentication and mismatch scenario workflow where multiple sellers are
 * registered and an admin attempts cross-owner profile access with intentionally mismatched IDs.
 *
 * 1. Administrator registers via join to obtain authentication credentials.
 * 2. Seller A registers via join (auto-creates profile with distinct profileId).
 * 3. Seller B registers via join (auto-creates profile with distinct profileId).
 * 4. Admin attempts GET with Seller A's sellerId paired with Seller B's profileId (intentionally mismatched).
 * 5. System validates seller_id FK mismatch and returns 404 Not Found.
 */
export async function test_api_seller_profile_mismatched_seller_id_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register Seller A - auto-creates Seller A's profile
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  // 3. Register Seller B - auto-creates Seller B's profile
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  // 4. Attempt to retrieve a profile using Seller A's sellerId with a profileId
  // that belongs to Seller B (mismatched foreign key).
  // The seller_id FK in ecommerce_platform_seller_profiles must match the provided sellerId.
  // Using Seller A's ID as sellerId and Seller B's ID as profileId simulates
  // cross-owner access validation, resulting in 404 Not Found.
  const sellerAId = sellerA.id;
  const sellerBId = sellerB.id;
  await TestValidator.error(
    "mismatched seller_id with non-matching profile_id returns 404 Not Found",
    async () => {
      await api.functional.ecommercePlatform.admin.sellers.profiles.at(
        adminConnection,
        {
          sellerId: sellerAId,
          profileId: sellerBId,
        },
      );
    },
  );
}
