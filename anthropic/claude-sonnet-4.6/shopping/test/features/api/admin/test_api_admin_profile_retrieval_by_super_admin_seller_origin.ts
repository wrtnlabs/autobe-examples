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
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_seller_admin_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_requests_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_admin_profile_retrieval_by_super_admin_seller_origin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, { body: {} });
  // 2. Register seller account with known credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller submits a seller approval request
  const sellerApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(sellerApproval);
  // 4. Super admin approves the seller approval
  const approvedSellerApproval =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.update(
      superAdminConnection,
      {
        approvalId: sellerApproval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedSellerApproval);
  TestValidator.equals(
    "seller approval status is approved",
    approvedSellerApproval.status,
    "approved",
  );
  // 5. Seller submits an admin promotion request
  const adminRequest =
    await generate_random_shopping_mall_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(adminRequest);
  // 6. Super admin approves the admin promotion request
  const reviewedAdminRequest =
    await api.functional.shoppingMall.superAdmin.adminRequests.review(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IReview,
      },
    );
  typia.assert(reviewedAdminRequest);
  // 7. Retrieve the admin profile
  // The adminId is the ID of the newly promoted admin record.
  // The review response (IShoppingMallCancellationRequest) maps the admin request;
  // the primary `id` of the reviewed request corresponds to the admin record ID.
  const adminId = reviewedAdminRequest.id;
  const adminProfile = await api.functional.shoppingMall.superAdmin.admins.at(
    superAdminConnection,
    { adminId },
  );
  typia.assert(adminProfile);
  // 8. Validate core admin profile fields
  TestValidator.equals("adminProfile.id matches", adminProfile.id, adminId);
  TestValidator.equals(
    "actor_type is seller",
    adminProfile.actor_type,
    "seller",
  );
  TestValidator.equals("grade is regular", adminProfile.grade, "regular");
  TestValidator.equals("deleted_at is null", adminProfile.deleted_at, null);
  TestValidator.equals(
    "email matches seller email",
    adminProfile.email,
    sellerEmail,
  );
  // 9. Validate the origin is IShoppingMallAdminOfSeller
  // The origin is a union type: IShoppingMallAdminOfCustomer | IShoppingMallAdminOfSeller
  // IShoppingMallAdminOfSeller has a 'seller' property; IShoppingMallAdminOfCustomer has 'customer'
  const origin = adminProfile.origin as IShoppingMallAdminOfSeller;
  TestValidator.predicate(
    "origin has seller property (IShoppingMallAdminOfSeller)",
    () => "seller" in origin,
  );
  TestValidator.equals(
    "origin seller email matches",
    origin.seller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "origin seller isBanned is false",
    origin.seller.isBanned,
    false,
  );
  TestValidator.equals(
    "origin seller isSuspended is false",
    origin.seller.isSuspended,
    false,
  );
  TestValidator.equals(
    "origin admin grade is regular",
    origin.admin.grade,
    "regular",
  );
  TestValidator.equals(
    "origin admin email matches",
    origin.admin.email,
    sellerEmail,
  );
}
