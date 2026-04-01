import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test retrieving an approved seller account with complete shop profile information as an administrator.
 *
 * Workflow:
 * 1. Create and authenticate administrator account
 * 2. Create seller account and submit approval request
 * 3. Administrator approves the seller registration
 * 4. Seller creates shop profile with name, description, and logo
 * 5. Administrator retrieves seller account with profile
 * 6. Validate response structure and data integrity
 */
export async function test_api_seller_retrieve_approved_with_profile(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for reuse
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Seller logs in and submits approval request
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerLoginConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // 4. Administrator approves the seller
  const approvedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminLoginConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("approval status", approvedRequest.status, "approved");
  // 5. Seller creates shop profile
  const shopName = RandomGenerator.paragraph({ sentences: 1 });
  const description = RandomGenerator.content({ paragraphs: 2 });
  const logoUri = typia.random<string & tags.Format<"uri">>();
  const profile = await api.functional.shoppingMall.sellers.profile.update(
    sellerLoginConnection,
    {
      body: {
        shop_name: shopName,
        description: description,
        logo_image_uri: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(logoUri),
      } satisfies IShoppingMallSellerProfile.IUpdate,
    },
  );
  typia.assert(profile);
  // 6. Administrator retrieves seller with profile
  const sellerWithProfile =
    await api.functional.shoppingMall.administrator.sellers.at(
      adminLoginConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(sellerWithProfile);
  // Validate response structure
  TestValidator.equals("seller id matches", sellerWithProfile.id, sellerId);
  TestValidator.equals("email matches", sellerWithProfile.email, sellerEmail);
  TestValidator.predicate(
    "has created_at",
    sellerWithProfile.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at",
    sellerWithProfile.updated_at !== undefined,
  );
  TestValidator.predicate(
    "profile exists",
    sellerWithProfile.profile !== undefined,
  );
  TestValidator.equals(
    "profile shop name",
    sellerWithProfile.profile.shop_name,
    shopName,
  );
  TestValidator.equals(
    "profile description",
    sellerWithProfile.profile.description,
    description,
  );
  TestValidator.equals(
    "profile logo uri",
    sellerWithProfile.profile.logo_image_uri,
    logoUri,
  );
  TestValidator.equals(
    "profile seller id",
    sellerWithProfile.profile.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "profile seller email",
    sellerWithProfile.profile.seller.email,
    sellerEmail,
  );
}