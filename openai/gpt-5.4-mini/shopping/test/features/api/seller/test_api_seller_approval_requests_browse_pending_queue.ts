import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_requests_browse_pending_queue(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller browsing administrator approval requests in the pending queue.
   *
   * Validates that an authenticated seller can access the approval-request browse endpoint with normal paging controls and receive a paginated list of administrator approval-request summaries.
   *
   * The test focuses on the public summary shape used for seller oversight, including pagination metadata and the presence of applicant and reviewer administrator summaries with lifecycle fields.
   *
   * 1. Authenticate a seller on an isolated connection.
   * 2. Browse approval requests with default paging values.
   * 3. Validate pagination metadata and summary item structure.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const output =
    await api.functional.mallPlatform.seller.approvalRequests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page is valid",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    output.pagination.pages >= 0,
  );
  for (const item of output.data) {
    typia.assert(item);
    typia.assert(item.administrator);
    typia.assert(item.reviewerAdministrator);
    TestValidator.predicate("request reason exists", item.reason.length > 0);
    TestValidator.predicate("request status exists", item.status.length > 0);
    TestValidator.predicate(
      "reviewedAt is nullable or populated",
      item.reviewedAt === null || item.reviewedAt.length > 0,
    );
    TestValidator.predicate(
      "createdAt is populated",
      item.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updatedAt is populated",
      item.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "deletedAt is nullable or populated",
      item.deletedAt === null || item.deletedAt.length > 0,
    );
  }
}
