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
 * Test partial update of seller profile - modifies only name and logo_uri while preserving description.
 *
 * Validates that the seller profile update endpoint accepts partial payloads and correctly preserves
 * unmodified fields. This test focuses on the scenario where sellers want to quickly update individual
 * profile fields without resubmitting all profile information.
 *
 * The test verifies:
 * - Partial update payload with only name and logo_uri is accepted
 * - Updated fields (name, logo_uri) reflect new values
 * - Unchanged field (description) retains its previous value
 * - Response includes complete profile data after update
 *
 * 1. Register seller with authorize_seller_join utility
 * 2. Create initial profile with full data (name, description, logo_uri)
 * 3. Perform partial update with only name and logo_uri fields
 * 4. Validate updated fields and preserved description
 */
export async function test_api_seller_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller using utility function
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create seller-specific connection with token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 3. Create initial profile with full data
  const initialName = RandomGenerator.name(2);
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialLogoUri = typia.random<string & tags.Format<"uri">>();
  const initialProfile =
    await api.functional.ecommerceMall.seller.sellers.me.profile.put(
      sellerConnection,
      {
        body: typia.assert<IEcommerceMallSellerProfile.IUpdate>({
          name: initialName,
          description: initialDescription,
          logoUri: initialLogoUri,
        }),
      },
    );
  typia.assert(initialProfile);
  // Store initial values for comparison
  const storedDescription = initialProfile.description;
  // 4. Perform partial update with only name and logo_uri
  const updatedName = RandomGenerator.name(2);
  const updatedLogoUri = typia.random<string & tags.Format<"uri">>();
  const updatedProfile =
    await api.functional.ecommerceMall.seller.sellers.me.profile.put(
      sellerConnection,
      {
        body: typia.assert<IEcommerceMallSellerProfile.IUpdate>({
          name: updatedName,
          logoUri: updatedLogoUri,
        }),
      },
    );
  typia.assert(updatedProfile);
  // 5. Validate updated fields
  TestValidator.equals(
    "updated name matches input",
    updatedProfile.name,
    updatedName,
  );
  TestValidator.equals(
    "updated logo_uri matches input",
    updatedProfile.logo_uri,
    updatedLogoUri,
  );
  // 6. Validate description is preserved (unchanged from initial value)
  TestValidator.equals(
    "description preserved after partial update",
    updatedProfile.description,
    storedDescription,
  );
  // 7. Validate profile ID and seller reference remain unchanged
  TestValidator.equals(
    "profile ID unchanged",
    updatedProfile.id,
    initialProfile.id,
  );
  TestValidator.equals(
    "seller ID unchanged",
    updatedProfile.seller.id,
    initialProfile.seller.id,
  );
}