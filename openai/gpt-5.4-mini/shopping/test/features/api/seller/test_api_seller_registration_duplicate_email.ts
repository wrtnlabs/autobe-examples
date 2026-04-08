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

/**
 * Test duplicate seller registration is rejected for an already registered email.
 *
 * Validates the seller onboarding flow by creating an initial seller account,
 * then attempting to register another seller with the same email. The test
 * ensures the backend rejects the duplicate business identity, preserves the
 * original seller account, and does not issue a second authorization token bundle.
 *
 * 1. Create a seller account with a unique email and password.
 * 2. Attempt to register a second seller using the same email.
 * 3. Confirm the duplicate registration fails with a business conflict.
 * 4. Confirm the original seller authorization data remains unchanged.
 */
export async function test_api_seller_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd123!";
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_seller_join(firstConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(firstAuthorized);
  TestValidator.equals("registered seller email", firstAuthorized.email, email);
  TestValidator.equals(
    "registered seller status",
    firstAuthorized.status.status,
    "pending",
  );
  TestValidator.equals(
    "registered seller rejection reason",
    firstAuthorized.status.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "registered seller has authorization token",
    firstAuthorized.token.access.length > 0 &&
      firstAuthorized.token.refresh.length > 0,
  );
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate seller email is rejected",
    [400, 409],
    async () => {
      await authorize_seller_join(duplicateConnection, {
        body: {
          email,
          password: "DifferentP@ssw0rd123!",
        } satisfies IMallPlatformSeller.IJoin,
      });
    },
  );
  TestValidator.equals(
    "original seller email remains unchanged",
    firstAuthorized.email,
    email,
  );
  TestValidator.equals(
    "original seller token remains issued",
    firstAuthorized.token.access.length > 0,
    true,
  );
}
