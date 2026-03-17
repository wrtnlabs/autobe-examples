import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_seller_admin_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_admin_of_seller_linkage_retrieval_for_seller_promoted_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  const sellerEmail = sellerAuthorized.email;
  // Step 2: Submit admin promotion request as seller
  const adminRequest =
    await generate_random_shopping_mall_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason: "I want to help manage the platform",
        },
      },
    );
  typia.assert(adminRequest);
  const requestId = adminRequest.id;
  // Step 3: Register a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuthorized);
  // Step 4: Approve the seller's admin promotion request
  const reviewResult =
    await api.functional.shoppingMall.superAdmin.adminRequests.review(
      superAdminConnection,
      {
        requestId,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IReview,
      },
    );
  typia.assert(reviewResult);
  // Step 5: Activate the newly promoted admin account using seller's email
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: sellerEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminAuthorized);
  const adminId = adminAuthorized.id;
  // Step 6: Retrieve the seller-origin linkage record as admin
  const linkage = await api.functional.shoppingMall.admin.admins.ofSeller.at(
    adminConnection,
    {
      adminId,
    },
  );
  typia.assert(linkage);
  // Step 7: Validate business logic fields
  TestValidator.equals(
    "admin actor_type should be seller",
    linkage.admin.actor_type,
    "seller",
  );
  TestValidator.equals(
    "seller id should match original seller",
    linkage.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "seller email should match original seller",
    linkage.seller.email,
    sellerEmail,
  );
  TestValidator.predicate(
    "seller should not be banned",
    linkage.seller.isBanned === false,
  );
  TestValidator.predicate(
    "seller should not be suspended",
    linkage.seller.isSuspended === false,
  );
  TestValidator.equals(
    "admin id in linkage should match",
    linkage.admin.id,
    adminId,
  );
}
