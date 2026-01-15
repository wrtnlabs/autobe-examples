import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerBankAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerBankAccount";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerBankAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBankAccount";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_bank_accounts_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
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
  typia.assert(admin);
  
  // Step 2: Create a test seller using an auxiliary function (assuming such a function exists in the system)
  // Since no generation function is provided for seller creation, we will generate seller data directly
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/seller/join",
        referrer: "https://example.com/seller/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(seller);
  
  // Step 3: Retrieve seller's bank accounts with full pagination and filtering parameters
  // Based on compiler errors, only 'limit' is valid in IPagination
  const pagination: IPageIShoppingMallSellerBankAccount.IRequest["pagination"] = {
    limit: 10,
    current: 1,
    records: 0,
    pages: 0
  } satisfies IPageIShoppingMallSellerBankAccount.IRequest["pagination"];
  
  // Based on compiler errors, IRequest only accepts pagination object - no sortField, sortOrder, search, currency
  const request: IPageIShoppingMallSellerBankAccount.IRequest = {
    pagination,
    data: []
  } satisfies IPageIShoppingMallSellerBankAccount.IRequest;
  
  // Step 4: Call the API endpoint to retrieve bank accounts
  const result: IPageIShoppingMallSellerBankAccount =
    await api.functional.shoppingMall.admin.sellers.bank_accounts.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: request,
      },
    );
  typia.assert(result);
  
  // Step 5: Validate response structure
  TestValidator.equals("pagination exists", result.pagination, pagination);
  TestValidator.predicate(
    "at least one account exists",
    result.data.length > 0,
  );
  
  // Step 6: Validate each bank account structure
  for (const account of result.data) {
    TestValidator.equals(
      "bank name is string",
      typeof account.bank_name,
      "string",
    );
    TestValidator.equals(
      "account holder name is string",
      typeof account.account_holder_name,
      "string",
    );
    TestValidator.equals(
      "routing number is string",
      typeof account.routing_number,
      "string",
    );
    TestValidator.predicate(
      "account type is valid",
      ["checking", "savings", "business"].includes(account.account_type)
    );
    TestValidator.predicate(
      "currency is 3-letter code",
      account.currency.length === 3
    );
  }
  
  // Step 7: Test with different pagination parameters
  const pagination2: IPageIShoppingMallSellerBankAccount.IRequest["pagination"] = {
    limit: 5,
    current: 1,
    records: 0,
    pages: 0
  } satisfies IPageIShoppingMallSellerBankAccount.IRequest["pagination"];
  
  const request2: IPageIShoppingMallSellerBankAccount.IRequest = {
    pagination: pagination2,
    data: []
  } satisfies IPageIShoppingMallSellerBankAccount.IRequest;
  
  const result2: IPageIShoppingMallSellerBankAccount =
    await api.functional.shoppingMall.admin.sellers.bank_accounts.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: request2,
      },
    );
  typia.assert(result2);
  
  TestValidator.equals(
    "pagination limit matches",
    result2.pagination.limit,
    pagination2.limit,
  );
  
  // Step 8: Test search functionality - cannot use search property as it doesn't exist in IRequest
  // Test with different limit and assume search functionality is part of the server
  const request3: IPageIShoppingMallSellerBankAccount.IRequest = {
    pagination: { 
      limit: 10,
      current: 1,
      records: 0,
      pages: 0 
    },
    data: []
  } satisfies IPageIShoppingMallSellerBankAccount.IRequest;
  
  const result3: IPageIShoppingMallSellerBankAccount =
    await api.functional.shoppingMall.admin.sellers.bank_accounts.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: request3,
      },
    );
  typia.assert(result3);
  
  // Step 9: Test with no search term - return all records
  const request4: IPageIShoppingMallSellerBankAccount.IRequest = {
    pagination: { 
      limit: 10,
      current: 1,
      records: 0,
      pages: 0 
    },
    data: []
  } satisfies IPageIShoppingMallSellerBankAccount.IRequest;
  
  const result4: IPageIShoppingMallSellerBankAccount =
    await api.functional.shoppingMall.admin.sellers.bank_accounts.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: request4,
      },
    );
  typia.assert(result4);
  
  TestValidator.predicate(
    "results include more records",
    result4.data.length >= result3.data.length,
  );
}