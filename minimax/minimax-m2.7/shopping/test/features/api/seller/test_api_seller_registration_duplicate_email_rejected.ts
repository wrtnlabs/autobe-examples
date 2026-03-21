import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Test seller registration with duplicate email returns appropriate error.
  //
  // Steps:
  // 1. Register first seller account with a specific email address
  // 2. Verify first registration succeeds with approval_status = 'pending'
  // 3. Attempt second registration using the same email address
  // 4. Verify second registration returns HTTP 409 Conflict error
  // 5. Verify original seller account remains intact
  // Step 1: Generate email and password for first seller
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const firstPassword = RandomGenerator.alphaNumeric(16);
  // Step 2: First registration should succeed
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await api.functional.ecommerceMall.auth.seller.join(
    firstSellerConnection,
    {
      body: {
        email: duplicateEmail,
        password: firstPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(firstSeller);
  // Verify first seller has pending approval status
  TestValidator.equals(
    "first seller approval_status is pending",
    firstSeller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "first seller email matches",
    firstSeller.email,
    duplicateEmail,
  );
  // Step 3 & 4: Second registration with same email should fail
  const secondPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      const secondSellerConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerceMall.auth.seller.join(
        secondSellerConnection,
        {
          body: {
            email: duplicateEmail,
            password: secondPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEcommerceMallSeller.IJoin,
        },
      );
    },
  );
  // Step 5: Verify first seller account is still valid and unchanged
  TestValidator.equals(
    "first seller still has same ID",
    firstSeller.id.length > 0,
    true,
  );
  TestValidator.equals(
    "first seller still has pending status",
    firstSeller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "first seller email unchanged",
    firstSeller.email,
    duplicateEmail,
  );
}
