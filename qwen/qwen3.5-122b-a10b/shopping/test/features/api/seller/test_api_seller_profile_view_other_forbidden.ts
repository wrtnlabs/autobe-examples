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
 * Test that sellers cannot access other sellers' shop profiles.
 *
 * Validates the access control rule that sellers can only view their own profile data. This test creates two separate seller accounts and attempts to retrieve one seller's profile using another seller's authentication, expecting the system to reject the request with an HTTP error (403 Forbidden or 404 Not Found).
 *
 * Additionally verifies that sellers can successfully access their own profiles to confirm the access control is properly scoped and not overly restrictive.
 *
 * 1. Create first seller account with random credentials.
 * 2. Create second seller account with different random credentials.
 * 3. Extract second seller's profile ID from their authorized response.
 * 4. Attempt to access second seller's profile using first seller's authenticated connection.
 * 5. Validate that the request fails with HTTP 403 or 404 error.
 * 6. Verify first seller can successfully access their own profile.
 */
export async function test_api_seller_profile_view_other_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first seller account
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller1);
  // 2. Create second seller account
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller2);
  // 3. Get seller2's profile ID and validate it exists
  const seller2ProfileId = seller2.profile?.id;
  TestValidator.predicate(
    "seller2 has profile",
    seller2ProfileId !== null && seller2ProfileId !== undefined,
  );
  // 4. Attempt to access seller2's profile using seller1's connection (should fail)
  await TestValidator.httpError(
    "seller cannot access other seller's profile",
    [403, 404],
    async () => {
      await api.functional.ecommerce.seller.profiles.at(seller1Connection, {
        profileId: seller2ProfileId!,
      });
    },
  );
  // 5. Verify seller1 CAN access their own profile (should succeed)
  const seller1ProfileId = seller1.profile?.id;
  TestValidator.predicate(
    "seller1 has profile",
    seller1ProfileId !== null && seller1ProfileId !== undefined,
  );
  const seller1Profile = await api.functional.ecommerce.seller.profiles.at(
    seller1Connection,
    {
      profileId: seller1ProfileId!,
    },
  );
  typia.assert(seller1Profile);
  TestValidator.equals(
    "own profile accessible",
    seller1Profile.id,
    seller1ProfileId,
  );
}
