import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentVaultEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentVaultEntry";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_vault_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a dummy vault entry ID (since we cannot create actual entries)
  // Use a valid UUID format as required by the API
  const vaultEntryId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt admin access to a vault entry that doesn't exist
  // This should trigger a 404 error
  await TestValidator.error(
    "admin should receive 404 for non-existent vault entry",
    async () => {
      await api.functional.shoppingMall.admin.payment_vault_entries.at(
        adminConnection,
        {
          vaultEntryId: vaultEntryId,
        },
      );
    },
  );
}
