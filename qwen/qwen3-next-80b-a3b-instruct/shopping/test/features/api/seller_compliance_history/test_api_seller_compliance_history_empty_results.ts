import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerComplianceHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerComplianceHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBankAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBankAccount";
import type { IShoppingMallSellerBillingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBillingAddress";
import type { IShoppingMallSellerComplianceHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerComplianceHistory";
import type { IShoppingMallSellerOnboardingProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingProgress";
import type { IShoppingMallSellerPayoutSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutSettings";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallSellerSocialMediaHandles } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSocialMediaHandles";
import type { IShoppingMallSellerVerificationDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerificationDocument";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_seller_verification_document } from "../../../prepare/prepare_random_shopping_mall_seller_verification_document";
import { prepare_random_shopping_mall_seller_bank_account } from "../../../prepare/prepare_random_shopping_mall_seller_bank_account";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_sellers_verification_documents_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_verification_documents_create";
import { generate_random_shopping_mall_seller_sellers_bank_accounts_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_bank_accounts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_compliance_history_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access compliance history
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // adminConnection.headers is now updated with JWT token
  // Step 2: Create a seller account with no compliance events
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData: IShoppingMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    business_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    createdAt: new Date().toISOString(),
  };
  const seller = await authorize_member_join(sellerConnection, {
    body: sellerData,
  });
  // sellerConnection.headers is now updated with JWT token
  // Step 3: Ensure no compliance events by creating verification documents and bank accounts without triggering any compliance actions
  // Create verification documents linked to the actual seller ID
  await generate_random_shopping_mall_seller_sellers_verification_documents_create(
    sellerConnection,
    {
      params: { sellerId: seller.id },
      body: {
        document_type: "id_card",
        file_uri: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  // Create bank account linked to the actual seller ID
  await generate_random_shopping_mall_seller_sellers_bank_accounts_create(
    sellerConnection,
    {
      params: { sellerId: seller.id },
      body: {
        bank_name: RandomGenerator.name(),
        account_number: typia.random<string & tags.MinLength<5> & tags.MaxLength<34> & tags.Pattern<"^[a-zA-Z0-9\\-\\s]+$">>(),
        routing_number: typia.random<string & tags.MinLength<7> & tags.MaxLength<15> & tags.Pattern<"^\\d+$">>(),
        account_holder_name: sellerData.business_name,
        currency: "KRW",
        country_code: "KR",
        account_type: "business",
      },
    },
  );
  // Step 4: As admin, retrieve the seller's compliance history
  // Since no compliance events occurred, expect empty array with correct pagination
  const complianceHistory =
    await api.functional.shoppingMall.admin.sellers.compliance_history.index(
      adminConnection,
      {
        sellerId: seller.id,
      },
    );
  // Step 5: Validate response structure without any compliance events
  typia.assert(complianceHistory);
  // Verify pagination metadata is correct for empty results
  TestValidator.equals(
    "total records should be 0",
    complianceHistory.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    complianceHistory.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 0",
    complianceHistory.pagination.current,
    0,
  );
  TestValidator.predicate(
    "limit should be positive",
    complianceHistory.pagination.limit > 0,
  );
  // Verify data array is empty
  TestValidator.equals(
    "data array should be empty",
    complianceHistory.data.length,
    0,
  );
  // The endpoint returns a valid structure (200 success) with empty array - no error thrown
  // This validates that the API returns a consistent response even for sellers with no compliance history
}