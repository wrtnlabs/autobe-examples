import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDispute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate admin-dispute search functionality by filtering and paginating
 * dispute cases as an authenticated admin. Also check
 * unauthenticated/unauthorized access denial.
 *
 * Steps:
 *
 * 1. Register (and authenticate as) a new admin.
 * 2. As admin, perform /shoppingMall/admin/disputes search (patch) with: (a) no
 *    filters, (b) various single-field filters (status, subject substring,
 *    page/limit), (c) multi-field combined filters.
 * 3. For each, assert type, and that results match filter/pagination args.
 * 4. Also: test unauthenticated access (connection with headers:{}), must fail.
 */
export async function test_api_dispute_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10) + "/!1Aa";
  const adminName = RandomGenerator.name();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Search disputes as admin with no filters
  const noFilterResult = await api.functional.shoppingMall.admin.disputes.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(noFilterResult);
  TestValidator.predicate(
    "dispute search result is array",
    Array.isArray(noFilterResult.data),
  );
  TestValidator.equals(
    "pagination current page is 1 by default",
    noFilterResult.pagination.current,
    1,
  );

  // Step 3: If there are any disputes, try filtering by status and subject
  if (noFilterResult.data.length > 0) {
    // a) pick a dispute to use for filter tests
    const sample = RandomGenerator.pick(noFilterResult.data);

    // Filter by status
    const resultByStatus =
      await api.functional.shoppingMall.admin.disputes.index(connection, {
        body: {
          status: sample.status,
        },
      });
    typia.assert(resultByStatus);
    for (const d of resultByStatus.data)
      TestValidator.equals(
        "dispute status matches filter",
        d.status,
        sample.status,
      );

    // Filter by subject substring
    const sub = RandomGenerator.substring(sample.subject);

    const resultBySubject =
      await api.functional.shoppingMall.admin.disputes.index(connection, {
        body: {
          subject: sub,
        },
      });
    typia.assert(resultBySubject);
    for (const d of resultBySubject.data)
      TestValidator.predicate(
        "dispute subject includes search substring",
        d.subject.includes(sub),
      );

    // Filter by customer_id or seller_id if present
    if (sample.customer?.id) {
      const resultByCustomer =
        await api.functional.shoppingMall.admin.disputes.index(connection, {
          body: {
            customer_id: sample.customer.id,
          },
        });
      typia.assert(resultByCustomer);
      for (const d of resultByCustomer.data)
        TestValidator.equals(
          "dispute customer id matches filter",
          d.customer.id,
          sample.customer.id,
        );
    }
    if (sample.seller?.id) {
      const resultBySeller =
        await api.functional.shoppingMall.admin.disputes.index(connection, {
          body: {
            seller_id: sample.seller.id,
          },
        });
      typia.assert(resultBySeller);
      for (const d of resultBySeller.data)
        TestValidator.equals(
          "dispute seller id matches filter",
          d.seller.id,
          sample.seller.id,
        );
    }
    // Filter by admin id if present
    if (sample.admin?.id) {
      const resultByAdmin =
        await api.functional.shoppingMall.admin.disputes.index(connection, {
          body: {
            admin_id: sample.admin.id,
          },
        });
      typia.assert(resultByAdmin);
      for (const d of resultByAdmin.data)
        TestValidator.equals(
          "dispute admin id matches filter",
          d.admin?.id,
          sample.admin.id,
        );
    }

    // Combined filter: status + subject substring (should further narrow)
    const resultCombined =
      await api.functional.shoppingMall.admin.disputes.index(connection, {
        body: {
          status: sample.status,
          subject: sub,
        },
      });
    typia.assert(resultCombined);
    for (const d of resultCombined.data) {
      TestValidator.equals(
        "status matches in combined filter",
        d.status,
        sample.status,
      );
      TestValidator.predicate(
        "subject includes in combined filter",
        d.subject.includes(sub),
      );
    }

    // Pagination test
    const resultPaginated =
      await api.functional.shoppingMall.admin.disputes.index(connection, {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      });
    typia.assert(resultPaginated);
    TestValidator.equals(
      "results limited per page (limit=1)",
      resultPaginated.data.length,
      1,
    );
    TestValidator.equals(
      "pagination current page is 1",
      resultPaginated.pagination.current,
      1,
    );
  }

  // Step 4: Unauthenticated access must fail (admin required)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deny dispute admin search without authentication",
    async () => {
      await api.functional.shoppingMall.admin.disputes.index(unauthConn, {
        body: {},
      });
    },
  );
}
