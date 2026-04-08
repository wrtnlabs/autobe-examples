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

export async function test_api_seller_approvals_filter_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple seller accounts for testing
  const sellers: IEcommerceSeller.IAuthorized[] = [];
  for (let i = 0; i < 5; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
      body: {
        email: `seller${i}_${typia.random<string & tags.Format<"email">>()}`,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSeller.IJoin,
    });
    typia.assert(seller);
    sellers.push(seller);
  }
  // 2. Create admin connection for accessing seller approvals endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  // Note: In production, admin credentials would be configured
  // This assumes admin is already authenticated or credentials are available
  // 3. Test status filtering - approved requests
  const approvedFilter = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        status: "approved",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(approvedFilter);
  // 4. Test status filtering - rejected requests
  const rejectedFilter = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        status: "rejected",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(rejectedFilter);
  // 5. Test date range filtering on created_at
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const createdAtFilter = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        createdAtFrom: thirtyDaysAgo.toISOString(),
        createdAtTo: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(createdAtFilter);
  // 6. Test date range filtering on reviewed_at
  const reviewedAtFilter =
    await api.functional.ecommerce.seller.approvals.index(adminConnection, {
      body: {
        reviewedAtFrom: thirtyDaysAgo.toISOString(),
        reviewedAtTo: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceSellerApproval.IRequest,
    });
  typia.assert(reviewedAtFilter);
  // 7. Test combined filters (status + date range)
  const combinedFilter = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        status: "approved",
        createdAtFrom: thirtyDaysAgo.toISOString(),
        createdAtTo: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(combinedFilter);
  // 8. Test sorting by reviewed_at
  const sortedFilter = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        sortBy: "reviewedAt",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(sortedFilter);
  // 9. Test empty result set with future date range
  const farFuture = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
  const emptyFilter = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        createdAtFrom: farFuture.toISOString(),
        createdAtTo: farFuture.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(emptyFilter);
  // 10. Validate pagination structure
  TestValidator.equals(
    "approved filter returns valid pagination",
    approvedFilter.pagination !== null,
    true,
  );
  TestValidator.equals(
    "rejected filter returns valid pagination",
    rejectedFilter.pagination !== null,
    true,
  );
  TestValidator.equals(
    "empty filter returns empty data array",
    emptyFilter.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter pagination shows zero records",
    emptyFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter pagination shows zero pages",
    emptyFilter.pagination.pages,
    0,
  );
}
