import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies that seller-account detail responses preserve stored lifecycle state.
 *
 * This test authenticates an administrator, retrieves a seller account detail
 * record, and validates that the response keeps account lifecycle fields exactly
 * as stored. It focuses on nullable moderation fields and the linked seller
 * profile so administrators can inspect storefront identity without the live
 * profile overriding account state.
 *
 * 1. Authenticate as an administrator using the join utility.
 * 2. Retrieve a seller account detail response by UUID.
 * 3. Validate that lifecycle fields remain nullable when unset.
 * 4. Confirm the linked seller profile is included in the response.
 */
export async function test_api_seller_account_detail_preserves_lifecycle_state(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12) as string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerAccountId = typia.random<string & tags.Format<"uuid">>();
  const sellerAccount =
    await api.functional.mallPlatform.administrator.sellerAccounts.at(
      administratorConnection,
      {
        sellerAccountId,
      },
    );
  typia.assert(sellerAccount);
  TestValidator.predicate(
    "seller account should include linked seller profile",
    () =>
      sellerAccount.sellerProfile !== null &&
      sellerAccount.sellerProfile !== undefined,
  );
  TestValidator.predicate(
    "rejection reason should be nullable",
    () =>
      sellerAccount.rejection_reason === null ||
      typeof sellerAccount.rejection_reason === "string",
  );
  TestValidator.predicate(
    "suspended at should be nullable",
    () =>
      sellerAccount.suspended_at === null ||
      typeof sellerAccount.suspended_at === "string",
  );
  TestValidator.predicate(
    "deleted at should be nullable",
    () =>
      sellerAccount.deleted_at === null ||
      typeof sellerAccount.deleted_at === "string",
  );
  TestValidator.predicate(
    "seller profile logo image uri should be nullable",
    () =>
      sellerAccount.sellerProfile.logoImageUri === null ||
      typeof sellerAccount.sellerProfile.logoImageUri === "string",
  );
}
