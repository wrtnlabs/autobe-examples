import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller registration prevents duplicate email sign-up.
   *
   * Validates that a seller can register successfully with a unique email and
   * that a second registration attempt using the same email is rejected. This
   * ensures seller email uniqueness at the account level and protects the
   * original seller account from being duplicated or replaced.
   *
   * 1. Register the first seller with a unique email and valid password.
   * 2. Confirm the returned authorized seller payload matches the created email.
   * 3. Attempt a second seller registration using the same email.
   * 4. Confirm the duplicate registration is rejected and no new account is created.
   */
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(firstSeller);
  TestValidator.equals(
    "registered seller email should match input",
    firstSeller.email,
    email,
  );
  TestValidator.predicate(
    "registered seller id should be a non-empty string",
    firstSeller.id.length > 0,
  );
  TestValidator.predicate(
    "authorization token should include access token",
    firstSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token should include refresh token",
    firstSeller.token.refresh.length > 0,
  );
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate seller registration should fail",
    async () => {
      await authorize_seller_join(duplicateConnection, {
        body: {
          email,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IMallPlatformSeller.IJoin,
      });
    },
  );
}
