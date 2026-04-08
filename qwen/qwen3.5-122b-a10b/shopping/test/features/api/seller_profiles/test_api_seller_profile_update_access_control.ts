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
 * Test seller profile update access control validation.
 *
 * Validates that sellers can only update their own profiles and cannot modify other sellers' profiles. This test ensures proper data isolation and ownership verification in the seller profile update workflow.
 *
 * The test creates two separate seller accounts, authenticates both, and verifies that when the first seller attempts to update the second seller's profile using the second seller's profile ID, the system correctly rejects this unauthorized access attempt with an appropriate HTTP error.
 *
 * 1. First seller registers and authenticates through join operation.
 * 2. Second seller registers and authenticates through join operation.
 * 3. Extract profile IDs from both seller registration responses.
 * 4. First seller attempts to update second seller's profile.
 * 5. Validates that the system rejects the unauthorized update with HTTP error.
 */
export async function test_api_seller_profile_update_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller registration and authentication
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    firstSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(firstSeller);
  // 2. Second seller registration and authentication
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller: IEcommerceSeller.IAuthorized =
    await authorize_seller_join(secondSellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSeller.IJoin,
    });
  typia.assert(secondSeller);
  // 3. Verify both sellers have different profile IDs
  TestValidator.notEquals(
    "sellers must have different profile IDs",
    firstSeller.profile?.id,
    secondSeller.profile?.id,
  );
  // 4. First seller attempts to update second seller's profile (unauthorized access)
  // System should reject with HTTP error (401 Unauthorized, 403 Forbidden, or 404 Not Found)
  await TestValidator.httpError(
    "first seller cannot update second seller's profile",
    [401, 403, 404],
    async () => {
      await api.functional.ecommerce.seller.profiles.putByProfileid(
        firstSellerConnection,
        {
          profileId: secondSeller.profile!.id,
          body: {
            shop_name: RandomGenerator.name(2),
            shop_description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IEcommerceSellerProfile.IUpdate,
        },
      );
    },
  );
}
