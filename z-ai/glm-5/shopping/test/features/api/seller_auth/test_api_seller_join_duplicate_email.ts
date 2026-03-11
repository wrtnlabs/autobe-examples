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
 * Test that seller registration rejects duplicate email addresses.
 *
 * Validates the business rule: email addresses must be unique across all
 * seller accounts. When a second registration attempt uses an email that
 * already exists, the system should reject it with an appropriate error.
 */
export async function test_api_seller_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a unique email for testing
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  // 2. Create first seller account with the email
  const firstConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstConnection, {
    body: {
      email: duplicateEmail,
    },
  });
  typia.assert(firstSeller);
  // 3. Verify first seller was created successfully
  TestValidator.equals("first seller email", firstSeller.email, duplicateEmail);
  TestValidator.predicate(
    "first seller has valid id",
    firstSeller.id.length > 0,
  );
  // 4. Attempt to register second seller with the same email
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email should be rejected", async () => {
    await authorize_seller_join(secondConnection, {
      body: {
        email: duplicateEmail,
      },
    });
  });
}
