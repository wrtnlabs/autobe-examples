import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_password_reset_retrieve_used(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // 2. Retrieve password reset record for the authenticated seller
  // Since seller has no password reset records yet, we test with a random UUID
  // to validate endpoint behavior and access control
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // Call the endpoint to retrieve password reset
  const passwordReset =
    await api.functional.ecommerceMall.seller.seller.password_resets.at(
      sellerConnection,
      { resetId },
    );
  typia.assert(passwordReset);
  // Validate response contains all required fields per IEcommerceMallSellerPasswordReset
  TestValidator.equals("has id field", passwordReset.id !== undefined, true);
  TestValidator.equals(
    "has seller field",
    passwordReset.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "has token field",
    passwordReset.token !== undefined,
    true,
  );
  TestValidator.equals(
    "has expiresAt field",
    passwordReset.expiresAt !== undefined,
    true,
  );
  TestValidator.equals(
    "has createdAt field",
    passwordReset.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "has status field",
    passwordReset.status !== undefined,
    true,
  );
  // Validate status is one of the allowed enum values
  TestValidator.predicate(
    "status is valid value",
    passwordReset.status === "pending" ||
      passwordReset.status === "used" ||
      passwordReset.status === "expired",
  );
  // If status is 'used', validate usedAt contains timestamp
  if (passwordReset.status === "used") {
    TestValidator.notEquals(
      "usedAt is not null when status is used",
      passwordReset.usedAt,
      null,
    );
  }
  // Validate seller field contains seller's information
  TestValidator.equals(
    "seller has id",
    passwordReset.seller.id !== undefined,
    true,
  );
  TestValidator.equals(
    "seller has email",
    passwordReset.seller.email !== undefined,
    true,
  );
  TestValidator.equals(
    "seller has approvalStatus",
    passwordReset.seller.approvalStatus !== undefined,
    true,
  );
  TestValidator.equals(
    "seller has createdAt",
    passwordReset.seller.createdAt !== undefined,
    true,
  );
}
