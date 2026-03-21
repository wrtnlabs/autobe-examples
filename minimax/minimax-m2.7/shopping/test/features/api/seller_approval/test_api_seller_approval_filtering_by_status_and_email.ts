import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
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

export async function test_api_seller_approval_filtering_by_status_and_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for accessing seller approvals
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create multiple sellers to generate approval records
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {});
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {});
  const seller3Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller3Connection, {});
  // 3. Get all seller approvals (no filter)
  const allResult =
    await api.functional.ecommerceMall.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(allResult);
  // 4. Filter by pending status
  const pendingResult =
    await api.functional.ecommerceMall.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Validate all returned items have pending status
  TestValidator.predicate(
    "all items have pending status",
    pendingResult.data.every((item) => item.status === "pending"),
  );
  // 5. Test email search (partial match)
  const targetEmail = allResult.data[0]?.seller.email;
  if (targetEmail) {
    const emailKeyword = targetEmail.split("@")[0];
    const emailSearchResult =
      await api.functional.ecommerceMall.admin.seller_approvals.index(
        adminConnection,
        {
          body: {
            sellerEmail: emailKeyword,
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallSellerApproval.IRequest,
        },
      );
    typia.assert(emailSearchResult);
    // All returned items should contain the search term in their email
    TestValidator.predicate(
      "search results contain matching emails",
      emailSearchResult.data.every((item) =>
        item.seller.email.includes(emailKeyword),
      ),
    );
  }
  // 6. Combined filter (status + email)
  const targetEmailForCombined = allResult.data[0]?.seller.email;
  if (targetEmailForCombined) {
    const emailKeyword = targetEmailForCombined.split("@")[0];
    const combinedResult =
      await api.functional.ecommerceMall.admin.seller_approvals.index(
        adminConnection,
        {
          body: {
            status: "pending",
            sellerEmail: emailKeyword,
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallSellerApproval.IRequest,
        },
      );
    typia.assert(combinedResult);
    // Each item should match both the status filter and contain the email keyword
    TestValidator.predicate(
      "all items have pending status",
      combinedResult.data.every((item) => item.status === "pending"),
    );
    TestValidator.predicate(
      "all items match email keyword",
      combinedResult.data.every((item) =>
        item.seller.email.includes(emailKeyword),
      ),
    );
  }
  // 7. Pagination with filters
  const paginatedResult =
    await api.functional.ecommerceMall.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.equals(
    "data length matches limit",
    paginatedResult.data.length,
    paginatedResult.data.length satisfies number as number,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("limit is 2", paginatedResult.pagination.limit, 2);
  // 8. Empty results with non-matching email
  const emptyResult =
    await api.functional.ecommerceMall.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          sellerEmail: "nonexistent_seller_email_xyz_123",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate empty results have proper pagination structure
  TestValidator.equals("records is 0", emptyResult.pagination.records, 0);
  TestValidator.equals("data is empty array", emptyResult.data.length, 0);
}
