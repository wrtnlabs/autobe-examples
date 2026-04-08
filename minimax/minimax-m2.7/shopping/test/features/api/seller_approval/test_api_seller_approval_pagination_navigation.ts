import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_approval_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const joinResult = await authorize_admin_join(connection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Authenticate as admin using the created credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: joinResult.email,
      password: "test1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Get first page with limit=10
  const page1 =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(page1);
  // 4. Cast pagination to access runtime properties
  const pagination1 = page1.pagination as any;
  // 5. Validate pagination metadata
  TestValidator.equals("pagination exists", page1.pagination !== null, true);
  TestValidator.equals(
    "current page is positive",
    pagination1.page > 0,
    true,
  );
  TestValidator.equals("limit matches request", pagination1.limit, 10);
  TestValidator.equals(
    "records is non-negative",
    pagination1.total >= 0,
    true,
  );
  TestValidator.equals(
    "pages is non-negative",
    pagination1.totalPages >= 0,
    true,
  );
  // 6. Validate data array
  TestValidator.equals("data is array", Array.isArray(page1.data), true);
  if (pagination1.total > 0) {
    TestValidator.predicate(
      "data length does not exceed limit",
      page1.data.length <= 10,
    );
    // 7. Validate ordering (createdAt descending)
    for (let i = 1; i < page1.data.length; i++) {
      const prev = new Date(page1.data[i - 1].createdAt).getTime();
      const curr = new Date(page1.data[i].createdAt).getTime();
      TestValidator.predicate(
        "data ordered by createdAt descending",
        prev >= curr,
      );
    }
  }
  // 8. Get second page to verify pagination works
  const page2 =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(page2);
  // 9. Cast pagination to access runtime properties
  const pagination2 = page2.pagination as any;
  // 10. Validate page 2 pagination metadata
  TestValidator.equals("page 2 current is 2", pagination2.page, 2);
  TestValidator.equals("page 2 limit matches", pagination2.limit, 10);
  // 11. Verify no duplicate IDs between pages (if both have data)
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = new Set(page1.data.map((item) => item.id));
    const hasOverlap = page2.data.some((item) => page1Ids.has(item.id));
    TestValidator.equals("no duplicate IDs between pages", hasOverlap, false);
  }
}
