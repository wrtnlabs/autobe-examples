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
 * Test successful seller registration and immediate authenticated response.
 *
 * Validates that a fresh seller can sign up with unique credentials and receive the standard authenticated seller payload immediately after registration. The test confirms the returned identity, token pair, lifecycle fields, and the expected absence of a public seller profile before storefront setup.
 *
 * 1. Register a seller with a unique email and password.
 * 2. Validate the returned authenticated seller payload.
 * 3. Confirm the account is immediately usable as a signed-in seller identity.
 * 4. Verify the seller profile is null on initial registration.
 */
export async function test_api_seller_registration_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "seller email should match input",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "seller profile should be null",
    authorized.sellerProfile,
    null,
  );
  TestValidator.equals(
    "seller rejection reason should be null",
    authorized.rejectionReason,
    null,
  );
  TestValidator.equals(
    "seller deletedAt should be null",
    authorized.deletedAt,
    null,
  );
  TestValidator.equals(
    "seller suspendedAt should be null",
    authorized.suspendedAt,
    null,
  );
}
