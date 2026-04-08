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
 * Retrieve an administrator-only seller account detail with linked seller profile data.
 *
 * Validates that an authenticated administrator can request a seller account detail by UUID and receive the complete seller account payload together with the linked seller profile. The response is checked for the account lifecycle fields, nullable moderation state fields, timestamps, and the nested profile structure that identifies the owning seller account.
 *
 * The test also confirms that the response does not expose password data and that the returned seller profile is present as part of the administrative read model.
 *
 * 1. Register and authorize a fresh administrator connection through the administrator join utility.
 * 2. Retrieve a seller account detail by UUID using the administrator-only endpoint.
 * 3. Validate the seller account and nested seller profile response structure.
 * 4. Confirm no password field is exposed in the returned payload.
 */
export async function test_api_seller_account_detail_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(admin);
  const sellerAccount =
    await api.functional.mallPlatform.administrator.sellerAccounts.at(
      adminConnection,
      {
        sellerAccountId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(sellerAccount);
  typia.assert(sellerAccount.sellerProfile);
  typia.assert(sellerAccount.sellerProfile.sellerAccount);
  TestValidator.equals(
    "seller profile references the same seller account id",
    sellerAccount.sellerProfile.sellerAccount.id,
    sellerAccount.id,
  );
  TestValidator.equals(
    "seller profile references the same seller account email",
    sellerAccount.sellerProfile.sellerAccount.email,
    sellerAccount.email,
  );
  TestValidator.predicate(
    "seller account response does not expose password data",
    !Object.prototype.hasOwnProperty.call(
      sellerAccount as object,
      "password",
    ) &&
      !Object.prototype.hasOwnProperty.call(
        sellerAccount as object,
        "passwordHash",
      ) &&
      !Object.prototype.hasOwnProperty.call(
        sellerAccount as object,
        "password_hash",
      ),
  );
}
