import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can view their own pending approval requests after submitting a registration request.
 *
 * Validates the complete flow of registering a seller account, submitting an explicit approval request, and then listing the pending approval requests via the paginated PATCH endpoint. Ensures that the response contains the correct pagination metadata, that the retrieved record has the expected pending status, that review-related fields are null, and that the record belongs to the authenticated seller by verifying the seller email.
 *
 * 1. Register a new seller account via the join endpoint, obtaining the seller's JWT token and profile.
 * 2. Submit a seller approval request via the POST endpoint, creating a pending approval request record.
 * 3. List the seller's pending approval requests with pagination parameters (page 1, limit 10, status pending).
 * 4. Validate pagination metadata: current page, limit, total records, and total pages.
 * 5. Validate the first record has status pending, null rejection_reason, null reviewer, null reviewed_at.
 * 6. Verify the seller email in the record matches the registered seller's email.
 */
export async function test_api_seller_approval_request_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IECommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123!",
        shop_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller);
  // 2. Submit a seller approval request
  const approvalRequest: IECommerceMallSellerApprovalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 3. List pending approval requests
  const page: IPageIECommerceMallSellerApprovalRequest.ISummary =
    await api.functional.eCommerceMall.seller.approval_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.equals("page limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "total records is at least 1",
    page.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages is at least 1",
    page.pagination.pages >= 1,
  );
  // 5. Validate data contains at least one record
  TestValidator.predicate(
    "data array has at least 1 entry",
    page.data.length >= 1,
  );
  // 6. Validate the first record's fields
  const record: IECommerceMallSellerApprovalRequest.ISummary = page.data[0];
  typia.assert(record);
  TestValidator.equals("request status is pending", record.status, "pending");
  TestValidator.equals(
    "rejection reason is null",
    record.rejection_reason,
    null,
  );
  TestValidator.equals("reviewer is null", record.reviewer, null);
  TestValidator.equals("reviewed at is null", record.reviewed_at, null);
  // 7. Verify seller email matches the registered seller
  TestValidator.equals(
    "seller email matches registered seller",
    record.seller.email,
    seller.email,
  );
}
