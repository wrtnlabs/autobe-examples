import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
import type { IShoppingMallSuperAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminOfCustomer";
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

export async function test_api_super_admin_of_customer_origin_not_found_for_seller_origin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the acting super administrator
  const actingSuperAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(actingSuperAdminConnection, {});
  // Step 2: Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // Step 3: Seller submits a seller approval request
  const sellerApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      {},
    );
  typia.assert(sellerApproval);
  // Step 4: Acting super admin approves the seller approval request
  const approvedSellerApproval =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.update(
      actingSuperAdminConnection,
      {
        approvalId: sellerApproval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedSellerApproval);
  // Step 5: Seller submits an admin promotion request
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
  // Step 6: Acting super admin approves the admin request
  const reviewedRequest =
    await api.functional.shoppingMall.superAdmin.adminRequests.review(
      actingSuperAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IReview,
      },
    );
  typia.assert(reviewedRequest);
  // The reviewed request contains information about the admin that was created.
  // We need to find the admin ID to promote. The admin ID should correspond to
  // the seller's account after approval. We get it from the orderItem (which is
  // actually the adminRequest structure reused).
  // Since IShoppingMallCancellationRequest is reused for admin requests,
  // we need the admin's ID. The admin created from the seller's approval
  // has the same email as the seller. We need to use the adminRequest.id
  // as a reference to find the admin. However, based on the API available,
  // the admin ID comes from reviewing the request - The IShoppingMallCancellationRequest
  // returned by review doesn't directly expose an adminId.
  // Based on the scenario, after the admin request is approved, the seller becomes
  // a regular admin. The admin's id would be in the reviewed request.
  // Looking at the structure: IShoppingMallCancellationRequest has orderItem.id
  // which is of IShoppingMallOrderItem.ISummary. But in admin request context,
  // the id returned is the request's own id. The admin id would need to be obtained
  // through another endpoint, but we don't have a list admin endpoint.
  // However, the promote endpoint takes adminId which is the shopping_mall_admins.id
  // Since we can't list admins, we need to use the information from the approve response.
  // The IShoppingMallCancellationRequest.orderItem.id might map to the adminId in context.
  // Let's use reviewedRequest.orderItem.id as the adminId for promotion.
  const adminId = reviewedRequest.orderItem.id;
  // Step 7: Acting super admin promotes the seller-origin regular admin to super admin
  const promotedSuperAdmin =
    await api.functional.shoppingMall.superAdmin.admins.promote(
      actingSuperAdminConnection,
      {
        adminId: adminId,
      },
    );
  typia.assert(promotedSuperAdmin);
  // Target Action: Attempt to get customer-origin linkage for the seller-origin super admin
  // This should return 404 because the super admin was promoted from a seller, not a customer
  await TestValidator.httpError(
    "seller-origin super admin has no customer-origin linkage",
    404,
    async () => {
      await api.functional.shoppingMall.superAdmin.superAdmins.ofCustomer.at(
        actingSuperAdminConnection,
        {
          superAdminId: promotedSuperAdmin.id,
        },
      );
    },
  );
}
