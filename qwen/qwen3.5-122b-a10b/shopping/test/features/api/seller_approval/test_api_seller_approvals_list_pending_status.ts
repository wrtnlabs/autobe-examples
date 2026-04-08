import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approvals_list_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection (authentication assumed pre-configured for admin)
  // Note: In simulation mode, authentication is not required. For production testing,
  // admin credentials must be configured in the connection headers.
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Create multiple seller accounts with pending approval status
  const sellers = await ArrayUtil.asyncRepeat(3, async () => {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSeller.IJoin,
    });
    typia.assert(seller);
    return seller;
  });
  // Collect seller IDs for later validation
  const sellerIds = sellers.map((s) => s.id);
  // 3. Call seller approvals endpoint with pending status filter
  const approvals: IPageIEcommerceSellerApproval.ISummary =
    await api.functional.ecommerce.seller.approvals.index(adminConnection, {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSellerApproval.IRequest,
    });
  typia.assert(approvals);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    approvals.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    approvals.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    approvals.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    approvals.pagination.pages >= 0,
  );
  // 5. Validate we have approval records
  TestValidator.predicate("has approval records", approvals.data.length > 0);
  // 6. Validate each approval record
  for (const approval of approvals.data) {
    typia.assert(approval);
    // Validate status is pending
    TestValidator.equals("status is pending", approval.status, "pending");
    // Validate rejection reason is null for pending requests
    TestValidator.equals(
      "rejection reason is null",
      approval.rejection_reason,
      null,
    );
    // Validate reviewed_at is null for pending requests
    TestValidator.equals("reviewed_at is null", approval.reviewed_at, null);
    // Validate seller summary information exists
    TestValidator.predicate("seller has id", approval.seller.id.length > 0);
    TestValidator.predicate(
      "seller has shop name",
      approval.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "seller has created_at",
      approval.seller.created_at.length > 0,
    );
    // Validate approval has created_at
    TestValidator.predicate(
      "approval has created_at",
      approval.created_at.length > 0,
    );
    // Validate approval has updated_at
    TestValidator.predicate(
      "approval has updated_at",
      approval.updated_at.length > 0,
    );
  }
  // 7. Validate that created sellers appear in the approvals list
  const approvalSellerIds = approvals.data.map((a) => a.seller.id);
  for (const sellerId of sellerIds) {
    TestValidator.predicate(
      `seller ${sellerId} appears in pending approvals`,
      approvalSellerIds.includes(sellerId),
    );
  }
  // 8. Validate sorting order (created_at descending)
  if (approvals.data.length > 1) {
    for (let i = 0; i < approvals.data.length - 1; i++) {
      const current = new Date(approvals.data[i].created_at).getTime();
      const next = new Date(approvals.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `approval ${i} is newer than approval ${i + 1}`,
        current >= next,
      );
    }
  }
}
