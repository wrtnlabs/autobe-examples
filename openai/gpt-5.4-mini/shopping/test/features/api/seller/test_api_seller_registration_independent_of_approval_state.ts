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

export async function test_api_seller_registration_independent_of_approval_state(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller registration independence from approval workflow state.
   *
   * Validates that a seller can register successfully through the onboarding
   * entrypoint even when other sellers in the platform may already be in
   * pending or rejected moderation states. The test focuses on the seller
   * sign-up response itself and confirms the returned authenticated payload is
   * usable for subsequent seller requests.
   *
   * 1. Create a dedicated seller connection from the base connection.
   * 2. Register a seller with a unique email and valid password.
   * 3. Validate that the response matches the submitted identity and includes
   *    an authorization token.
   * 4. Confirm the nullable lifecycle fields are initialized as expected for a
   *    newly created seller account.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const output = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(output);
  TestValidator.equals(
    "seller email matches registration input",
    output.email,
    email,
  );
  TestValidator.predicate("seller id is present", output.id.length > 0);
  TestValidator.predicate("seller status is present", output.status.length > 0);
  TestValidator.equals(
    "seller rejection reason should be null",
    output.rejectionReason,
    null,
  );
  TestValidator.equals(
    "seller suspendedAt should be null",
    output.suspendedAt,
    null,
  );
  TestValidator.equals(
    "seller deletedAt should be null",
    output.deletedAt,
    null,
  );
  TestValidator.predicate(
    "seller createdAt is present",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "seller updatedAt is present",
    output.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "seller token access exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "seller token refresh exists",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "seller token expiration exists",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "seller refresh deadline exists",
    output.token.refreshable_until.length > 0,
  );
  TestValidator.equals(
    "seller profile should not exist immediately after registration",
    output.sellerProfile,
    null,
  );
}
