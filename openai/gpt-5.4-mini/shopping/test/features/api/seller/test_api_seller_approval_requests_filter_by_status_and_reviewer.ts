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

export async function test_api_seller_approval_requests_filter_by_status_and_reviewer(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate seller approval-request browsing by review status and reviewer metadata.
   *
   * This test exercises the seller-facing approval-request list endpoint through an authenticated seller session. It focuses on reviewed approval requests, confirming that pagination metadata is preserved, reviewer administrator information is populated for decided records, and rejected requests retain their rejection details in the summary payload.
   *
   * 1. Authenticate a fresh seller session through the seller join utility.
   * 2. Browse approval requests using reviewed-state criteria and pagination controls.
   * 3. Verify the page metadata matches the requested browse window.
   * 4. Validate reviewed request summaries, including reviewer and rejection metadata.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const body = {
    status: "rejected",
    page: 1,
    limit: 10,
    sort: "-createdAt",
  } satisfies IMallPlatformAdministratorApprovalRequest.IRequest;
  const output =
    await api.functional.mallPlatform.seller.approvalRequests.index(
      sellerConnection,
      {
        body,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page is preserved",
    output.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "requested limit is preserved",
    output.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data size does not exceed requested limit",
    output.data.length <= body.limit,
  );
  for (const item of output.data) {
    TestValidator.equals(
      "approval request status matches requested filter",
      item.status,
      body.status,
    );
    TestValidator.predicate(
      "reviewed requests include reviewer administrator metadata",
      item.reviewerAdministrator !== null,
    );
    TestValidator.predicate(
      "reviewed requests include reviewed timestamp",
      item.reviewedAt !== null,
    );
    if (item.status === "rejected") {
      TestValidator.predicate(
        "rejected requests preserve rejection reason",
        item.rejectionReason !== null,
      );
    }
  }
}
