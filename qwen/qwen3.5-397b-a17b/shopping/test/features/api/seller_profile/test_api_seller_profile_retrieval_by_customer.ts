import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test customer retrieving an approved seller's shop profile.
 *
 * This test validates the complete seller approval workflow and profile retrieval:
 * 1. Seller registers and submits approval request
 * 2. Administrator approves the seller
 * 3. Seller updates their shop profile
 * 4. Customer retrieves the seller's public profile
 * 5. Validates all profile fields are correctly returned
 */
export async function test_api_seller_profile_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Submit seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_approval_requests_create(
      sellerConnection,
      { body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate },
    );
  typia.assert(approvalRequest);
  // 3. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 4. Administrator approves the seller
  const approvedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("approval status", approvedRequest.status, "approved");
  // 5. Seller updates shop profile
  const shopName = RandomGenerator.paragraph({ sentences: 1 });
  const description = RandomGenerator.content({ paragraphs: 2 });
  const logoUri = typia.random<string & tags.Format<"uri">>();
  const updatedProfile =
    await api.functional.shoppingMall.sellers.profile.update(sellerConnection, {
      body: {
        shop_name: shopName,
        description: description,
        logo_image_uri: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(logoUri),
      } satisfies IShoppingMallSellerProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // 6. Register customer account (for context, though endpoint is public)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 7. Retrieve seller's profile (public endpoint - no auth required)
  const profile = await api.functional.shoppingMall.sellers.profile.at(
    customerConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  typia.assert(profile);
  // 8. Validate profile structure and content
  TestValidator.equals("seller ID matches", profile.seller.id, sellerAuth.id);
  TestValidator.equals(
    "seller email matches",
    profile.seller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "approval status is approved",
    profile.seller.approval_status,
    "approved",
  );
  TestValidator.equals("shop name matches", profile.shop_name, shopName);
  TestValidator.equals("description matches", profile.description, description);
  TestValidator.equals("logo URI matches", profile.logo_image_uri, logoUri);
  TestValidator.predicate(
    "profile is not deleted",
    profile.deleted_at === null,
  );
  TestValidator.predicate("has valid created_at", profile.created_at !== null);
  TestValidator.predicate("has valid updated_at", profile.updated_at !== null);
}