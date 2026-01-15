import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerBankAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBankAccount";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_bank_account_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminUser);
  // Step 2: Generate random sellerId and accountId since we cannot create sellers through API
  // The test assumes a bank account exists for the seller in the system
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  const accountId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the bank account by sellerId and accountId
  const retrievedAccount: IShoppingMallSellerBankAccount =
    await api.functional.shoppingMall.admin.sellers.bank_accounts.at(
      adminConnection,
      {
        sellerId,
        accountId,
      },
    );
  typia.assert(retrievedAccount);
  // Step 4: Validate the retrieved account structure matches the IShoppingMallSellerBankAccount schema
  // Only validate business-level properties, as typia.assert() has already validated types and formats
  TestValidator.equals(
    "bank name is not empty",
    retrievedAccount.bank_name.length > 0,
    true,
  );
  TestValidator.equals(
    "account number is not empty",
    retrievedAccount.account_number.length > 0,
    true,
  );
  TestValidator.equals(
    "routing number is not empty",
    retrievedAccount.routing_number.length > 0,
    true,
  );
  TestValidator.equals(
    "account holder name is not empty",
    retrievedAccount.account_holder_name.length > 0,
    true,
  );
  TestValidator.equals(
    "account type is valid",
    ["checking", "savings", "business"].includes(retrievedAccount.account_type),
    true,
  );
  TestValidator.predicate(
    "is active is boolean",
    typeof retrievedAccount.is_active === "boolean",
  );
}
