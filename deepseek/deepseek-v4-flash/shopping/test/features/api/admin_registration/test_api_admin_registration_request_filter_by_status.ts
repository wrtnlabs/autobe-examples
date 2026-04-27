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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_registration_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Prepare authenticated seller connection
  //----
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  //----
  // Filter by pending status
  //----
  const pendingPage =
    await api.functional.eCommerceMall.seller.admin_registration_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  for (const request of pendingPage.data) {
    TestValidator.equals(
      "pending: status is pending",
      request.status,
      "pending",
    );
    TestValidator.equals("pending: reviewer is null", request.reviewer, null);
    TestValidator.equals(
      "pending: reviewed_at is null",
      request.reviewed_at,
      null,
    );
  }
  //----
  // Filter by approved status
  //----
  const approvedPage =
    await api.functional.eCommerceMall.seller.admin_registration_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(approvedPage);
  for (const request of approvedPage.data) {
    TestValidator.equals(
      "approved: status is approved",
      request.status,
      "approved",
    );
    TestValidator.predicate(
      "approved: reviewer is not null",
      request.reviewer !== null,
    );
    TestValidator.predicate(
      "approved: reviewed_at is not null",
      request.reviewed_at !== null,
    );
  }
  //----
  // Filter by rejected status
  //----
  const rejectedPage =
    await api.functional.eCommerceMall.seller.admin_registration_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IECommerceMallAdminRegistrationRequest.IRequest,
      },
    );
  typia.assert(rejectedPage);
  for (const request of rejectedPage.data) {
    TestValidator.equals(
      "rejected: status is rejected",
      request.status,
      "rejected",
    );
    TestValidator.predicate(
      "rejected: rejection_reason is not null",
      request.rejection_reason !== null,
    );
  }
}
