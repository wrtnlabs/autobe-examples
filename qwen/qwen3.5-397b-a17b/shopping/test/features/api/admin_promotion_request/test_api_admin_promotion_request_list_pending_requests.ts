import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator retrieval of pending administrator promotion requests.
 *
 * Validates the complete workflow for super administrators to browse pending promotion requests submitted by members and sellers. Ensures that the pagination structure is correct, all returned requests have pending status, and applicant information is properly populated based on actor type.
 *
 * Special attention is given to verifying that pending requests have null reviewer fields and that the response includes proper pagination metadata for navigation.
 *
 * 1. Super administrator registers and authenticates via join operation.
 * 2. Calls admin promotion requests list endpoint with status filter set to 'pending'.
 * 3. Validates pagination metadata structure and values.
 * 4. Validates each request has correct status, applicant information, and null reviewer.
 * 5. Verifies requests are sorted by createdAt in descending order.
 */
export async function test_api_admin_promotion_request_list_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // 2. Fetch pending promotion requests
  const response =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", response.pagination.limit === 10);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate all requests have pending status
  for (const request of response.data) {
    TestValidator.equals("status is pending", request.status, "pending");
    // 5. Validate reviewer is null for pending requests
    TestValidator.equals(
      "reviewer is null for pending",
      request.reviewer,
      null,
    );
    // 6. Validate required fields exist
    TestValidator.predicate("has valid id", request.id.length > 0);
    TestValidator.predicate(
      "has actorType",
      request.actorType === "member" || request.actorType === "seller",
    );
    TestValidator.predicate("has reason", request.reason.length > 0);
    TestValidator.predicate("has createdAt", request.createdAt.length > 0);
    // 7. Validate applicant information based on actorType
    if (request.actorType === "member") {
      TestValidator.predicate(
        "member applicant has id",
        request.applicant.id.length > 0,
      );
      TestValidator.predicate(
        "member applicant has email",
        request.applicant.email.length > 0,
      );
    } else if (request.actorType === "seller") {
      TestValidator.predicate(
        "seller applicant has id",
        request.applicant.id.length > 0,
      );
      TestValidator.predicate(
        "seller applicant has email",
        request.applicant.email.length > 0,
      );
    }
  }
  // 8. Validate sorting by createdAt descending (if multiple requests)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].createdAt).getTime();
      const next = new Date(response.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "sorted by createdAt descending",
        current >= next,
      );
    }
  }
}
