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
 * Test seller registration with a duplicate email address.
 *
 * Validates the business rule that seller email addresses must be unique across
 * the platform. When attempting to register a second seller account using an email
 * that is already registered, the system must return a 409 Conflict status code
 * with an appropriate error message indicating the email is already in use.
 *
 * 1. Register first seller with a random email address - expect success
 * 2. Attempt to register second seller with the same email - expect 409 Conflict
 * 3. Validate error response indicates email is already registered
 */
export async function test_api_seller_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email for this test
  const existingEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Step 1: Register first seller successfully
  const firstSeller = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    {
      body: {
        email: existingEmail,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(firstSeller);
  // Step 2: Attempt to register second seller with same email
  // Step 3: Expect 409 Conflict status code
  await TestValidator.httpError(
    "duplicate email returns 409 Conflict",
    409,
    async () =>
      api.functional.ecommerceMall.auth.seller.join(connection, {
        body: {
          email: existingEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallSeller.IJoin,
      }),
  );
}
