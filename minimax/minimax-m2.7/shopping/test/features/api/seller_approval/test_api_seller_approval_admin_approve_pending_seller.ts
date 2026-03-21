import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";

/**
 * Test that an administrator can successfully approve a pending seller registration.
 *
 * Steps:
 * 1. Authenticate as an admin using POST /ecommerceMall/auth/admin/join
 * 2. Create a seller account by joining as seller via POST /ecommerceMall/auth/seller/join
 * 3. Create an initial seller approval record with 'pending' status via POST /ecommerceMall/admin/seller-approvals
 * 4. Call PUT /ecommerceMall/admin/seller-approvals/{approvalId} with status 'approved'
 *
 * Expected results:
 * - Response status should be 200 OK
 * - Response body should contain the updated approval record with status 'approved'
 * - The seller field should contain the approved seller information
 * - The reviewedByAdmin field should contain the admin who performed the approval
 * - The rejectionReason should be null
 * - The createdAt timestamp should be preserved, updatedAt should be newer
 */
export async function test_api_seller_approval_admin_approve_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to perform seller approvals
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create a seller account that needs approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Create an initial seller approval record with 'pending' status
  const approvalCreate =
    await api.functional.ecommerceMall.admin.seller_approvals.create(
      adminConnection,
      {
        body: typia.assert<IEcommerceMallSellerApproval.ICreate>({
          sellerId: seller.id,
          status: "pending",
        }),
      },
    );
  typia.assert(approvalCreate);
  // Store the createdAt timestamp to verify it's preserved
  const createdAt = approvalCreate.createdAt;
  // 4. Update the approval to 'approved' status via PUT endpoint
  const updatedApproval =
    await api.functional.ecommerceMall.admin.seller_approvals.update(
      adminConnection,
      {
        approvalId: approvalCreate.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallSellerApproval.IUpdate,
      },
    );
  typia.assert(updatedApproval);
  // 5. Validate the response
  TestValidator.equals(
    "approval status should be 'approved'",
    updatedApproval.status,
    "approved",
  );
  TestValidator.equals(
    "seller ID should match",
    updatedApproval.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "reviewedByAdmin should contain admin info",
    updatedApproval.reviewedByAdmin?.id,
    admin.id,
  );
  TestValidator.equals(
    "rejectionReason should be null",
    updatedApproval.rejectionReason,
    null,
  );
  TestValidator.equals(
    "createdAt should be preserved",
    updatedApproval.createdAt,
    createdAt,
  );
  TestValidator.predicate(
    "updatedAt should be newer than createdAt",
    new Date(updatedApproval.updatedAt) >= new Date(createdAt),
  );
}
