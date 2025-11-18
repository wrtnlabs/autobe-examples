import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogBlockReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

/**
 * Validate sorting of catalog block reasons by `code` and `created_at`.
 *
 * Business goal: ensure that admin list views of catalog block reasons are
 * stable and predictable when clients use `order_by` and `order_direction` in
 * PATCH /shoppingMall/admin/catalogBlockReasons, so operators can rely on
 * consistent ordering when scanning or comparing reasons.
 *
 * Scenario:
 *
 * 1. Join an admin account using POST /auth/admin/join to obtain an authenticated
 *    admin context; the SDK will automatically install the access token into
 *    the connection headers.
 * 2. As that admin, create three catalog block reasons via POST
 *    /shoppingMall/admin/catalogBlockReasons with distinct `code` values (e.g.,
 *    "A_CODE", "M_CODE", "Z_CODE") and arbitrary but valid
 *    name/description/severity_level.
 * 3. Call PATCH /shoppingMall/admin/catalogBlockReasons with
 *    IShoppingMallCatalogBlockReason.IRequest where `order_by` is "code" and
 *    `order_direction` is "asc", with a sufficiently large `limit` to include
 *    all three created records in a single page.
 * 4. Assert via typia.assert that the response is a valid
 *    IPageIShoppingMallCatalogBlockReason.ISummary and verify via
 *    TestValidator.predicate that the three known codes appear in ascending
 *    lexicographical order (A_CODE, M_CODE, Z_CODE) in the page `data`.
 * 5. Call PATCH again with `order_by` "code" and `order_direction" "desc" and
 *    confirm via TestValidator.predicate that the three codes now appear in
 *    reverse order (Z_CODE, M_CODE, A_CODE).
 * 6. Additionally, exercise `order_by` "created_at" in both ascending and
 *    descending directions by calling the index endpoint twice more with
 *    `order_by` "created_at" and `order_direction` "asc" / "desc", and use
 *    TestValidator.predicate to confirm that the `data` array is globally
 *    sorted by the `created_at` timestamps in the requested direction.
 */
export async function test_api_admin_catalog_block_reasons_sorting_by_code_or_created_at(
  connection: api.IConnection,
) {
  // 1. Create an admin via join to obtain an authorized connection
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create three catalog block reasons with deterministic codes
  const reasonPayloads: IShoppingMallCatalogBlockReason.ICreate[] = [
    {
      code: "A_CODE",
      name: "Reason A",
      description: "Reason with code A_CODE",
      severity_level: "low",
    },
    {
      code: "M_CODE",
      name: "Reason M",
      description: "Reason with code M_CODE",
      severity_level: "medium",
    },
    {
      code: "Z_CODE",
      name: "Reason Z",
      description: "Reason with code Z_CODE",
      severity_level: "high",
    },
  ];

  for (const payload of reasonPayloads) {
    const created =
      await api.functional.shoppingMall.admin.catalogBlockReasons.create(
        connection,
        {
          body: payload,
        },
      );
    typia.assert(created);
  }

  // Helper to find indices of our specific codes in a page of summaries
  const findCodeIndices = (
    summaries: IShoppingMallCatalogBlockReason.ISummary[],
  ) => {
    const indexOf = (code: string): number =>
      summaries.findIndex((s) => s.code === code);
    return {
      A_CODE: indexOf("A_CODE"),
      M_CODE: indexOf("M_CODE"),
      Z_CODE: indexOf("Z_CODE"),
    };
  };

  // 3. Fetch page sorted by code ascending
  const pageByCodeAsc: IPageIShoppingMallCatalogBlockReason.ISummary =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      {
        body: {
          page: 0,
          limit: 20,
          order_by: "code",
          order_direction: "asc",
        },
      },
    );
  typia.assert(pageByCodeAsc);

  const ascIndices = findCodeIndices(pageByCodeAsc.data);
  TestValidator.predicate("all three codes appear in code-asc page", () => {
    return (
      ascIndices.A_CODE !== -1 &&
      ascIndices.M_CODE !== -1 &&
      ascIndices.Z_CODE !== -1
    );
  });
  TestValidator.predicate(
    "codes are ordered ascending by code (A_CODE < M_CODE < Z_CODE)",
    () =>
      ascIndices.A_CODE < ascIndices.M_CODE &&
      ascIndices.M_CODE < ascIndices.Z_CODE,
  );

  // 4. Fetch page sorted by code descending
  const pageByCodeDesc: IPageIShoppingMallCatalogBlockReason.ISummary =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      {
        body: {
          page: 0,
          limit: 20,
          order_by: "code",
          order_direction: "desc",
        },
      },
    );
  typia.assert(pageByCodeDesc);

  const descIndices = findCodeIndices(pageByCodeDesc.data);
  TestValidator.predicate("all three codes appear in code-desc page", () => {
    return (
      descIndices.A_CODE !== -1 &&
      descIndices.M_CODE !== -1 &&
      descIndices.Z_CODE !== -1
    );
  });
  TestValidator.predicate(
    "codes are ordered descending by code (Z_CODE > M_CODE > A_CODE)",
    () =>
      descIndices.Z_CODE < descIndices.M_CODE &&
      descIndices.M_CODE < descIndices.A_CODE,
  );

  // Helper to validate created_at ordering on a page
  const assertCreatedAtSorted = (
    title: string,
    items: IShoppingMallCatalogBlockReason.ISummary[],
    direction: "asc" | "desc",
  ) => {
    TestValidator.predicate(title, () => {
      for (let i = 1; i < items.length; ++i) {
        const prev = items[i - 1].created_at;
        const curr = items[i].created_at;
        if (direction === "asc") {
          if (prev > curr) return false;
        } else {
          if (prev < curr) return false;
        }
      }
      return true;
    });
  };

  // 5. Sorting by created_at ascending
  const pageByCreatedAtAsc: IPageIShoppingMallCatalogBlockReason.ISummary =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      {
        body: {
          page: 0,
          limit: 20,
          order_by: "created_at",
          order_direction: "asc",
        },
      },
    );
  typia.assert(pageByCreatedAtAsc);
  assertCreatedAtSorted(
    "created_at is globally sorted ascending",
    pageByCreatedAtAsc.data,
    "asc",
  );

  // 6. Sorting by created_at descending
  const pageByCreatedAtDesc: IPageIShoppingMallCatalogBlockReason.ISummary =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      {
        body: {
          page: 0,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        },
      },
    );
  typia.assert(pageByCreatedAtDesc);
  assertCreatedAtSorted(
    "created_at is globally sorted descending",
    pageByCreatedAtDesc.data,
    "desc",
  );
}
