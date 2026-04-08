import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_archived_seller_search_pagination_across_multiple_pages(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for paginated archived seller search
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Admin authentication
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. First page with limit of 2
  const page1 = await api.functional.ecommerceMall.admin.archived_sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IEcommerceMallSeller.IArchiveRequest,
    },
  );
  typia.assert(page1);
  // 3. Validate first page structure
  TestValidator.equals("first page current", page1.pagination.current, 1);
  TestValidator.equals("first page limit", page1.pagination.limit, 2);
  TestValidator.predicate(
    "first page data count <= limit",
    page1.data.length <= 2,
  );
  // Track all IDs for uniqueness check across pages
  const allIds = new Set<string>();
  page1.data.forEach((seller) => allIds.add(seller.id));
  // 4. If total records > limit, verify pagination continues
  if (page1.pagination.records > 2 && page1.pagination.pages > 1) {
    // 5. Fetch second page
    const page2 =
      await api.functional.ecommerceMall.admin.archived_sellers.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 2,
          } satisfies IEcommerceMallSeller.IArchiveRequest,
        },
      );
    typia.assert(page2);
    // 6. Validate second page structure
    TestValidator.equals("second page current", page2.pagination.current, 2);
    TestValidator.equals(
      "second page limit matches",
      page2.pagination.limit,
      page1.pagination.limit,
    );
    TestValidator.equals(
      "second page records matches",
      page2.pagination.records,
      page1.pagination.records,
    );
    TestValidator.equals(
      "second page pages matches",
      page2.pagination.pages,
      page1.pagination.pages,
    );
    // 7. Check no duplicates across pages
    page2.data.forEach((seller) => {
      TestValidator.predicate(
        `no duplicate seller id ${seller.id} between page 1 and 2`,
        !allIds.has(seller.id),
      );
      allIds.add(seller.id);
    });
    // 8. Navigate to last page if it exists beyond page 2
    const lastPageNumber = page1.pagination.pages;
    if (lastPageNumber > 2) {
      const lastPage =
        await api.functional.ecommerceMall.admin.archived_sellers.index(
          adminConnection,
          {
            body: {
              page: lastPageNumber,
              limit: 2,
            } satisfies IEcommerceMallSeller.IArchiveRequest,
          },
        );
      typia.assert(lastPage);
      // Validate last page structure
      TestValidator.equals(
        "last page current",
        lastPage.pagination.current,
        lastPageNumber,
      );
      TestValidator.predicate(
        "last page is within bounds",
        lastPage.pagination.current <= lastPage.pagination.pages,
      );
      TestValidator.predicate(
        "last page data count <= limit",
        lastPage.data.length <= 2,
      );
      // Check no overlap with previously seen records
      lastPage.data.forEach((seller) => {
        TestValidator.predicate(
          `no duplicate seller id ${seller.id} on last page`,
          !allIds.has(seller.id),
        );
        allIds.add(seller.id);
      });
    }
  }
  // 9. Verify total unique IDs collected
  TestValidator.predicate(
    "unique ids count <= records",
    allIds.size <= page1.pagination.records,
  );
}
