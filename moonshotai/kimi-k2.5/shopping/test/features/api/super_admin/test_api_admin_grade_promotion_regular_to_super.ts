import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test that a super administrator can successfully promote a regular administrator to super administrator status.
 * Prerequisites: (1) Create a super administrator account via superAdmin join, (2) Create a customer account and submit an admin promotion request, (3) The super admin approves the request creating a regular administrator. Then call the target endpoint with grade='super_admin' to promote the regular administrator. Verify the response shows updated grade as 'super_admin', the updated_at timestamp reflects the change, and the regular administrator now has super administrator privileges including access to review admin promotion requests.
 */
export async function test_api_admin_grade_promotion_regular_to_super(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: "http://localhost:3000/superAdmin/join",
        referrer: "http://localhost:3000/",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Step 2: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // Step 3: Customer submits administrator promotion request
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Step 4: Super admin approves the request, creating a regular administrator
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Verify the request was approved
  TestValidator.equals(
    "promotion request status is approved",
    approvedRequest.status,
    "approved",
  );
  // Step 5: Get the admin ID from the approved request's requester (the promoted customer)
  const adminId = approvedRequest.requester.id;
  // Step 6: Promote regular administrator to super administrator
  const updatedAdmin =
    await api.functional.ecommerceMall.superAdmin.admins.grade.updateGrade(
      superAdminConnection,
      {
        adminId: adminId,
        body: {
          grade: "super_admin",
        } satisfies IEcommerceMallAdmin.IUpdateGrade,
      },
    );
  typia.assert(updatedAdmin);
  // Step 7: Verify business logic - grade is updated to 'super_admin'
  TestValidator.equals(
    "admin grade is super_admin",
    updatedAdmin.grade,
    "super_admin",
  );
  // Verify updated_at timestamp reflects the change (should be after created_at)
  TestValidator.predicate(
    "updated_at timestamp reflects the change",
    new Date(updatedAdmin.updated_at) > new Date(updatedAdmin.created_at),
  );
}
