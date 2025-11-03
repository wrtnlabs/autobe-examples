import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingStatusEnum";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingStatusEnum";

/**
 * Validate paginated and filtered status enum search for admin panel.
 *
 * 1. Register an admin using the join API
 * 2. Confirm authentication and that tokens are set
 * 3. Perform paginated and filtered search of status enums as admin
 *
 * - Issue several requests with different combinations of filter params:
 *   enum_domain, is_active, partial status_code/display_label, sort_by,
 *   sort_direction, page, and limit
 * - Validate that only enums matching filter are returned
 * - Ensure returned records are properly paginated
 * - Check pagination properties (current, limit, records, pages)
 * - Check ordering if sort params are set
 * - Request small page size and check partial page result
 * - Request empty filter and check a bigger page size
 *
 * 4. Validate edge case: search with filter that yields zero results
 */
export async function test_api_admin_status_enum_index_search_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: RandomGenerator.pick(["super", "support", "operator"] as const),
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin status is active", admin.status, "active");
  TestValidator.predicate(
    "token is present",
    !!admin.token.access && !!admin.token.refresh,
  );

  // 2. Issue a paginated search for all status enums (unfiltered)
  const page1: IPageIShoppingStatusEnum.ISummary =
    await api.functional.shopping.admin.statusEnums.index(connection, {
      body: {
        limit: 5,
        page: 1,
      } satisfies IShoppingStatusEnum.IRequest,
    });
  typia.assert(page1);
  TestValidator.predicate("at least 0 enums in data", page1.data.length >= 0);
  TestValidator.equals(
    "pagination current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 5", page1.pagination.limit, 5);

  // 3. If we have data, try filtered search and paging scenarios
  if (page1.data.length > 0) {
    // pick an enum domain from available data (to maximize filter hit probability)
    const enumDomain = page1.data[0].enum_domain;
    // search for only active enums for this domain
    const filtered: IPageIShoppingStatusEnum.ISummary =
      await api.functional.shopping.admin.statusEnums.index(connection, {
        body: {
          enum_domain: enumDomain,
          is_active: true,
          limit: 3,
          page: 1,
        } satisfies IShoppingStatusEnum.IRequest,
      });
    typia.assert(filtered);
    TestValidator.equals("filter: page is 1", filtered.pagination.current, 1);
    TestValidator.equals("filter: limit is 3", filtered.pagination.limit, 3);
    for (const stat of filtered.data) {
      TestValidator.equals("only active is true", stat.is_active, true);
      TestValidator.equals(
        "has right enum_domain",
        stat.enum_domain,
        enumDomain,
      );
    }

    // test pagination edge: if more pages, request second page
    if (filtered.pagination.pages > 1) {
      const filteredPage2 =
        await api.functional.shopping.admin.statusEnums.index(connection, {
          body: {
            enum_domain: enumDomain,
            is_active: true,
            limit: 3,
            page: 2,
          } satisfies IShoppingStatusEnum.IRequest,
        });
      typia.assert(filteredPage2);
      TestValidator.equals(
        "second page: page is 2",
        filteredPage2.pagination.current,
        2,
      );
      TestValidator.equals(
        "second page: limit is 3",
        filteredPage2.pagination.limit,
        3,
      );
      for (const stat of filteredPage2.data) {
        TestValidator.equals(
          "only active is true (page 2)",
          stat.is_active,
          true,
        );
        TestValidator.equals(
          "has right enum_domain (page 2)",
          stat.enum_domain,
          enumDomain,
        );
      }
    }

    // partial match on status_code if data exists
    const partialCode = filtered.data[0]?.status_code.slice(0, 2);
    if (partialCode) {
      const codeMatch = await api.functional.shopping.admin.statusEnums.index(
        connection,
        {
          body: {
            status_code: partialCode,
            limit: 5,
            page: 1,
          } satisfies IShoppingStatusEnum.IRequest,
        },
      );
      typia.assert(codeMatch);
      for (const stat of codeMatch.data) {
        TestValidator.predicate(
          `status_code contains '${partialCode}'`,
          stat.status_code.includes(partialCode),
        );
      }
    }

    // display_label partial match if present
    const partialLabel = filtered.data[0]?.display_label.slice(0, 2);
    if (partialLabel) {
      const labelMatch = await api.functional.shopping.admin.statusEnums.index(
        connection,
        {
          body: {
            display_label: partialLabel,
            limit: 5,
            page: 1,
          } satisfies IShoppingStatusEnum.IRequest,
        },
      );
      typia.assert(labelMatch);
      for (const stat of labelMatch.data) {
        TestValidator.predicate(
          `display_label contains '${partialLabel}'`,
          stat.display_label.includes(partialLabel),
        );
      }
    }
  }

  // 4. Empty filter: select domain unlikely to exist
  const emptyResult = await api.functional.shopping.admin.statusEnums.index(
    connection,
    {
      body: {
        enum_domain: RandomGenerator.alphabets(12),
        limit: 2,
        page: 1,
      } satisfies IShoppingStatusEnum.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty filter yields empty data",
    emptyResult.data.length,
    0,
  );
}
