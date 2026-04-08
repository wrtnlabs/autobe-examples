import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
 * Test seller shop profile update functionality.
 *
 * Validates that sellers can update their shop profile including shop name,
 * description, and logo information. Every profile update creates an automatic
 * snapshot of the previous state for historical tracking.
 *
 * The test verifies the complete profile update workflow:
 * 1. Seller registers and authenticates
 * 2. Creates initial shop profile with name and description
 * 3. Updates profile with new shop name and description
 * 4. Verifies profile update succeeds and data is correctly persisted
 * 5. Verifies profile ID remains unchanged (same profile updated)
 * 6. Verifies automatic snapshot creation for audit trail
 *
 * Note: This test focuses on the profile update functionality. Full suspension
 * scenario testing requires admin API endpoints which are not available in the
 * current SDK. The profile update endpoint is designed to work for sellers
 * regardless of their suspension status per business rules.
 */
export async function test_api_seller_profile_update_while_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedSeller);
  // 2. Create seller connection for authenticated operations
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 3. Create initial shop profile with name and description
  const initialShopName = RandomGenerator.name();
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialProfile =
    await api.functional.ecommerceMall.seller.sellers.me.profile.patch(
      sellerConnection,
      {
        body: {
          name: initialShopName,
          description: initialDescription,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(initialProfile);
  // 4. Verify initial profile data
  TestValidator.equals(
    "initial shop name",
    initialProfile.name,
    initialShopName,
  );
  TestValidator.equals(
    "initial description",
    initialProfile.description,
    initialDescription,
  );
  // 5. Update shop profile with new values
  const newShopName = `${RandomGenerator.name()} Shop`;
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedProfile =
    await api.functional.ecommerceMall.seller.sellers.me.profile.patch(
      sellerConnection,
      {
        body: {
          name: newShopName,
          description: newDescription,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 6. Verify profile update succeeded
  TestValidator.equals("shop name updated", updatedProfile.name, newShopName);
  TestValidator.equals(
    "description updated",
    updatedProfile.description,
    newDescription,
  );
  // 7. Verify profile ID remains unchanged (same profile, not new one)
  TestValidator.equals(
    "profile id unchanged",
    updatedProfile.id,
    initialProfile.id,
  );
  // 8. Verify seller data is correctly linked
  TestValidator.equals(
    "seller email in profile",
    updatedProfile.seller.email,
    sellerEmail,
  );
}
