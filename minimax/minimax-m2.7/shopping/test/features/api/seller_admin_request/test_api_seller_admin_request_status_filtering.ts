import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request";

export async function test_api_seller_admin_request_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Submit an admin privilege request (pending status)
  const adminRequest =
    await generate_random_ecommerce_mall_seller_admin_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(adminRequest);
  // 3. Filter by status='pending' - should return the request
  const pendingResult =
    await api.functional.ecommerceMall.seller.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending" as const,
        },
      },
    );
  typia.assert(pendingResult);
  // 4. Filter by status='approved' - should return empty
  const approvedResult =
    await api.functional.ecommerceMall.seller.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved" as const,
        },
      },
    );
  typia.assert(approvedResult);
  // 5. Filter by status='rejected' - should return empty
  const rejectedResult =
    await api.functional.ecommerceMall.seller.seller.admin_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected" as const,
        },
      },
    );
  typia.assert(rejectedResult);
  // Validate: pending filter returns the created request
  TestValidator.equals(
    "pending filter has 1 record",
    pendingResult.data.length,
    1,
  );
  TestValidator.equals(
    "pending request ID matches",
    pendingResult.data[0]!.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "pending status matches",
    pendingResult.data[0]!.status,
    "pending",
  );
  // Validate: approved filter returns empty
  TestValidator.equals(
    "approved filter has 0 records",
    approvedResult.data.length,
    0,
  );
  // Validate: rejected filter returns empty
  TestValidator.equals(
    "rejected filter has 0 records",
    rejectedResult.data.length,
    0,
  );
  // Validate pagination metadata for pending filter
  TestValidator.equals(
    "pending pagination current page",
    pendingResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pending pagination records >= 1",
    pendingResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pending pagination pages >= 1",
    pendingResult.pagination.pages >= 1,
  );
  // Validate pagination metadata for approved filter (empty)
  TestValidator.equals(
    "approved pagination current page",
    approvedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "approved pagination records",
    approvedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "approved pagination pages",
    approvedResult.pagination.pages,
    0,
  );
  // Validate pagination metadata for rejected filter (empty)
  TestValidator.equals(
    "rejected pagination current page",
    rejectedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "rejected pagination records",
    rejectedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "rejected pagination pages",
    rejectedResult.pagination.pages,
    0,
  );
}
