import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestOfCustomer";
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

export async function test_api_seller_admin_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Submit admin request as seller
  const adminRequestConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminRequestConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason:
        "I want to help manage the platform and ensure quality service for customers.",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Test filtering by status='pending'
  const pendingResult =
    await api.functional.ecommerceMall.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Validate all returned requests have status='pending'
  TestValidator.equals(
    "pending page has data",
    pendingResult.data.length > 0,
    true,
  );
  for (const request of pendingResult.data) {
    TestValidator.equals("status is pending", request.status, "pending");
    TestValidator.equals("actorType is seller", request.actorType, "seller");
  }
  // 4. Test filtering by status='approved' (expect empty initially)
  const approvedResult =
    await api.functional.ecommerceMall.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(approvedResult);
  // 5. Test filtering by status='rejected' (expect empty initially)
  const rejectedResult =
    await api.functional.ecommerceMall.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // 6. Test without status filter (should include the pending request)
  const allResult =
    await api.functional.ecommerceMall.seller.admin_requests.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "all requests page has data",
    allResult.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "includes our pending request",
    allResult.data.some(
      (r) => r.actorType === "seller" && r.status === "pending",
    ),
  );
  // 7. Test with actorType='seller' filter
  const sellerFilterResult =
    await api.functional.ecommerceMall.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          actorType: "seller",
          status: "pending",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(sellerFilterResult);
  for (const request of sellerFilterResult.data) {
    TestValidator.equals("actorType is seller", request.actorType, "seller");
    TestValidator.equals("status is pending", request.status, "pending");
  }
}
