import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_admin_requests_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Call admin requests listing endpoint with pagination parameters
  const response =
    await api.functional.ecommerceMall.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  // 3. Validate response with typia.assert
  typia.assert(response);
  // 4. Validate pagination structure exists
  TestValidator.equals(
    "pagination exists",
    response.pagination !== null && response.pagination !== undefined,
    true,
  );
  // 5. Validate data array exists
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // 6. Validate each request in data array has required fields
  for (const request of response.data) {
    TestValidator.equals(
      "request has id",
      request.id !== null && request.id !== undefined,
      true,
    );
    TestValidator.equals(
      "request has actorType",
      request.actorType === "customer" || request.actorType === "seller",
      true,
    );
    TestValidator.equals(
      "request has requestedGrade",
      request.requestedGrade === "admin" ||
        request.requestedGrade === "super_admin",
      true,
    );
    TestValidator.equals(
      "request has reason",
      typeof request.reason === "string",
      true,
    );
    TestValidator.equals(
      "request has status",
      request.status === "pending" ||
        request.status === "approved" ||
        request.status === "rejected",
      true,
    );
    TestValidator.equals(
      "request has createdAt",
      request.createdAt !== null && request.createdAt !== undefined,
      true,
    );
  }
}