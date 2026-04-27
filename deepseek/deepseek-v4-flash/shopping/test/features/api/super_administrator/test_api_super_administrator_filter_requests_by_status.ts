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

export async function test_api_super_administrator_filter_requests_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connections
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Register and authenticate as customer
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Register and authenticate as seller
  const seller = await authorize_seller_join(sellerConnection, {});
  // 4. Create a super administrator account
  // Need to first have an administrator to promote. Since we don't have one,
  // we create one through the admin registration flow.
  // Actually, the super admin join endpoint promotes an existing regular admin.
  // Since we need a super admin first, let's first create a regular admin by
  // having the customer submit an admin request and then... we need a super admin to approve it.
  // This is circular. Let's try using authorize_super_administrator_join with
  // the administrator_id of a customer (which won't work as admin).
  //
  // Alternative approach: The platform likely has a pre-seeded super admin
  // or the join endpoint works differently. Let's just call it.
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // 5. Customer submits an admin registration request
  const customerRequest =
    await generate_random_e_commerce_mall_customer_admin_registration_requests_create(
      customerConnection,
      {},
    );
  typia.assert(customerRequest);
  // 6. Seller submits an admin registration request
  const sellerRequest =
    await generate_random_e_commerce_mall_seller_admin_registration_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(sellerRequest);
  // 7. Super administrator approves the customer's request
  const approved =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.update(
      superAdminConnection,
      {
        requestId: customerRequest.id,
        body: {
          status: "approved" as const,
        } satisfies IECommerceMallAdminRegistrationRequest.IUpdate,
      },
    );
  typia.assert(approved);
  TestValidator.equals("approved status", approved.status, "approved");
  TestValidator.predicate("approved has reviewer", approved.reviewer !== null);
  TestValidator.predicate(
    "approved has reviewed_at",
    approved.reviewed_at !== null,
  );
  TestValidator.equals(
    "approved rejection_reason is null",
    approved.rejection_reason,
    null,
  );
  // 8. Super administrator rejects the seller's request
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejected =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.update(
      superAdminConnection,
      {
        requestId: sellerRequest.id,
        body: {
          status: "rejected" as const,
          rejectionReason,
        } satisfies IECommerceMallAdminRegistrationRequest.IUpdate,
      },
    );
  typia.assert(rejected);
  TestValidator.equals("rejected status", rejected.status, "rejected");
  TestValidator.predicate("rejected has reviewer", rejected.reviewer !== null);
  TestValidator.predicate(
    "rejected has reviewed_at",
    rejected.reviewed_at !== null,
  );
  TestValidator.equals(
    "rejected rejection_reason matches",
    rejected.rejection_reason,
    rejectionReason,
  );
  // 9. Filter by 'approved' — only the approved request should appear
  const approvedPage =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(approvedPage);
  TestValidator.equals("approved filter count", approvedPage.data.length, 1);
  TestValidator.equals(
    "approved filter status",
    approvedPage.data[0]!.status,
    "approved",
  );
  TestValidator.predicate(
    "approved has reviewer",
    approvedPage.data[0]!.reviewer !== null,
  );
  TestValidator.predicate(
    "approved has reviewed_at",
    approvedPage.data[0]!.reviewed_at !== null,
  );
  TestValidator.equals(
    "approved rejection_reason null",
    approvedPage.data[0]!.rejection_reason,
    null,
  );
  // 10. Filter by 'rejected' — only the rejected request should appear
  const rejectedPage =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(rejectedPage);
  TestValidator.equals("rejected filter count", rejectedPage.data.length, 1);
  TestValidator.equals(
    "rejected filter status",
    rejectedPage.data[0]!.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected has reviewer",
    rejectedPage.data[0]!.reviewer !== null,
  );
  TestValidator.predicate(
    "rejected has reviewed_at",
    rejectedPage.data[0]!.reviewed_at !== null,
  );
  TestValidator.equals(
    "rejected rejection_reason",
    rejectedPage.data[0]!.rejection_reason,
    rejectionReason,
  );
  // 11. No filter — both requests should appear
  const allPage =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(allPage);
  TestValidator.equals("unfiltered count", allPage.data.length, 2);
  const approvedStatuses = allPage.data.filter((r) => r.status === "approved");
  const rejectedStatuses = allPage.data.filter((r) => r.status === "rejected");
  TestValidator.equals("unfiltered has approved", approvedStatuses.length, 1);
  TestValidator.equals("unfiltered has rejected", rejectedStatuses.length, 1);
}
