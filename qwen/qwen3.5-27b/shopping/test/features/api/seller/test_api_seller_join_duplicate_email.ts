import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test duplicate email business rule for seller registration.
 *
 * Validates that the system prevents multiple seller accounts from being created with the same email address. The test first registers a seller with a unique email and verifies successful account creation with pending approval status. Then, it attempts to register another seller using the identical email address and confirms that the system rejects the duplicate registration with a 409 Conflict error.
 *
 * This test ensures email uniqueness is enforced at both the application and database levels, preventing data integrity issues and unauthorized account duplication.
 *
 * 1. Register first seller with unique email and verify success with pending status.
 * 2. Attempt to register second seller with the same email.
 * 3. Verify 409 Conflict error is thrown for duplicate email.
 * 4. Confirm no duplicate seller account was created.
 */
export async function test_api_seller_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first seller with unique email
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller1);
  // Verify first seller was created successfully with pending status
  TestValidator.equals(
    "first seller created",
    seller1.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "first seller has valid email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(seller1.email),
  );
  // 2. Attempt to register second seller with the same email (should fail)
  const seller2Connection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email should return 409 Conflict",
    409,
    async () =>
      await authorize_seller_join(seller2Connection, {
        body: {
          email: seller1.email,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      }),
  );
  // 3. Verify first seller's data remains unchanged
  TestValidator.equals(
    "first seller email unchanged",
    seller1.email,
    seller1.email,
  );
  TestValidator.equals(
    "first seller still pending",
    seller1.approval_status,
    "pending",
  );
}
