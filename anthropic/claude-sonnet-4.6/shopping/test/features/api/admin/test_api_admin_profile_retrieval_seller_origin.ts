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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { generate_random_shopping_mall_seller_admin_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_admin_profile_retrieval_seller_origin(
  connection: api.IConnection,
): Promise<void> {
  // ─── Step 1: Register Super Administrator ───────────────────────────────────
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // ─── Step 2: Register Seller Account ────────────────────────────────────────
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ─── Step 3: Seller Submits Admin Promotion Request ─────────────────────────
  const sellerAdminRequest =
    await generate_random_shopping_mall_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason: "I want to become an admin to help manage the platform.",
        },
      },
    );
  typia.assert(sellerAdminRequest);
  // ─── Step 4: Super Admin Approves Seller's Request ──────────────────────────
  const sellerRequestApproval =
    await api.functional.shoppingMall.superAdmin.adminRequests.review(
      superAdminConnection,
      {
        requestId: sellerAdminRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IReview,
      },
    );
  typia.assert(sellerRequestApproval);
  // ─── Step 5: Activate Seller-Origin Admin Account (target) ──────────────────
  const sellerAdminConnection: api.IConnection = { host: connection.host };
  const sellerAdminAuth = await authorize_admin_join(sellerAdminConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerAdminAuth);
  const sellerAdminId = sellerAdminAuth.id;
  // ─── Step 6: Register Customer Account ──────────────────────────────────────
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8> & tags.Format<"password">>();
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ─── Step 7: Customer Submits Admin Promotion Request ───────────────────────
  const customerAdminRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: "I want to become an admin to help manage the platform.",
        },
      },
    );
  typia.assert(customerAdminRequest);
  // ─── Step 8: Super Admin Approves Customer's Request ────────────────────────
  const customerRequestApproval =
    await api.functional.shoppingMall.superAdmin.adminRequests.review(
      superAdminConnection,
      {
        requestId: customerAdminRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IReview,
      },
    );
  typia.assert(customerRequestApproval);
  // ─── Step 9: Activate Customer-Origin Admin Account (caller/viewer) ──────────
  const callerAdminConnection: api.IConnection = { host: connection.host };
  const callerAdminAuth = await authorize_admin_join(callerAdminConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  typia.assert(callerAdminAuth);
  // ─── Step 10: Call GET /admin/admins/{sellerAdminId} as caller admin ──────────
  const adminProfile = await api.functional.shoppingMall.admin.admins.at(
    callerAdminConnection,
    {
      adminId: sellerAdminId,
    },
  );
  typia.assert(adminProfile);
  // ─── Step 11: Validate Response ──────────────────────────────────────────────
  // actor_type must be 'seller'
  TestValidator.equals(
    "actor_type is seller",
    adminProfile.actor_type,
    "seller",
  );
  // grade must be 'regular' (newly promoted admins start as regular)
  TestValidator.equals("grade is regular", adminProfile.grade, "regular");
  // deleted_at must be null (account is active)
  TestValidator.equals("deleted_at is null", adminProfile.deleted_at, null);
  // origin resolves to IShoppingMallAdminOfSeller — cast and validate seller fields
  const origin = adminProfile.origin as IShoppingMallAdminOfSeller;
  // origin.seller.email matches the seller's registered email
  TestValidator.equals(
    "origin seller email matches",
    origin.seller.email,
    sellerEmail,
  );
  // origin.seller.isBanned must be false
  TestValidator.equals(
    "seller isBanned is false",
    origin.seller.isBanned,
    false,
  );
  // origin.seller.isSuspended must be false
  TestValidator.equals(
    "seller isSuspended is false",
    origin.seller.isSuspended,
    false,
  );
  // origin.admin summary must reflect seller-origin admin's identity
  TestValidator.equals(
    "origin admin id matches",
    origin.admin.id,
    sellerAdminId,
  );
}