import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdminRegistrationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_customer_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_admin_registration_requests_create";
import { generate_random_e_commerce_mall_seller_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_seller_admin_registration_requests_create";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_registration_request";

/**
 * Test that a super administrator can view all pending administrator registration requests.
 *
 * Validates the complete request listing workflow where requests from both customers and sellers appear in the super administrator's view. Ensures that the requester_type discriminator correctly identifies the origin actor and that pending requests have null reviewer and null rejection_reason fields.
 *
 * Special attention is given to verifying sort order (newest first) and pagination metadata consistency. The response must contain both the customer-submitted and seller-submitted requests.
 *
 * 1. Create a super administrator account and authenticate.
 * 2. Create a customer account and submit an admin registration request.
 * 3. Create a seller account and submit an admin registration request.
 * 4. As the super administrator, query all pending registration requests.
 * 5. Validate both requests appear, requester_type is correct, reviewer/rejection_reason are null, and pagination metadata is valid.
 */
export async function test_api_super_administrator_view_pending_registration_requests(
  connection: api.IConnection,
): Promise<void> {
  // ---- Step 1: Create Super Administrator ----
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // ---- Step 2: Create Customer and Submit Admin Registration Request ----
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  const customerRequest =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {},
    );
  typia.assert(customerRequest);
  // ---- Step 3: Create Seller and Submit Admin Registration Request ----
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const sellerRequest =
    await generate_random_e_commerce_mall_seller_admin_registration_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(sellerRequest);
  // ---- Step 4: Super Administrator Views Pending Registration Requests ----
  const page =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.index(
      superAdminConnection,
      {
        body: {} satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(page);
  // ---- Step 5: Validation ----
  // Both requests should be in the result
  TestValidator.equals("both registration requests found", page.data.length, 2);
  // Find requests by requester_type
  const customerReq = page.data.find((r) => r.requester_type === "customer");
  const sellerReq = page.data.find((r) => r.requester_type === "seller");
  TestValidator.predicate(
    "customer-submitted request exists",
    customerReq !== undefined,
  );
  TestValidator.predicate(
    "seller-submitted request exists",
    sellerReq !== undefined,
  );
  // Verify pending request invariants: reviewer and rejection_reason are null
  TestValidator.equals(
    "customer request reviewer is null (pending)",
    customerReq!.reviewer,
    null,
  );
  TestValidator.equals(
    "customer request rejection_reason is null (pending)",
    customerReq!.rejection_reason,
    null,
  );
  TestValidator.equals(
    "seller request reviewer is null (pending)",
    sellerReq!.reviewer,
    null,
  );
  TestValidator.equals(
    "seller request rejection_reason is null (pending)",
    sellerReq!.rejection_reason,
    null,
  );
  // Verify sorted by newest first (created_at descending)
  const sortedDesc = page.data[0].created_at >= page.data[1].created_at;
  TestValidator.predicate("list order is newest first", sortedDesc);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination.current is valid",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    page.pagination.limit >= 1,
  );
  TestValidator.equals(
    "pagination.records equals total requests",
    page.pagination.records,
    2,
  );
  TestValidator.predicate(
    "pagination.pages is at least 1",
    page.pagination.pages >= 1,
  );
}
