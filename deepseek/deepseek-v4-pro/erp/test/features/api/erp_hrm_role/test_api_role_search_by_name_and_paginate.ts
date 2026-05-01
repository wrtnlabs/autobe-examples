import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test role search and pagination functionality with fuzzy name matching and cursor-based traversal.
 *
 * Validates the role listing endpoint's search capabilities using trigram similarity matching on role names, and its cursor-based pagination with configurable sort orders. Built-in roles (Owner, Manager, Employee) serve as the test dataset.
 *
 * The fuzzy search test verifies that partial name matches like "Manag" correctly return the "Manager" role while excluding unrelated roles like "Owner" and "Employee" that share insufficient trigram similarity.
 *
 * Pagination and sort tests cover four ordering configurations:
 *
 * 1. Fuzzy name search with "Manag" string — verifies trigram similarity matching.
 * 2. Cursor-based pagination with `created_at_desc` sort — verifies limit enforcement, newest-first ordering, and correct cursor traversal with no duplicate roles across pages.
 * 3. Reverse alphabetical sort with `name_desc` — verifies Z-A ordering.
 * 4. Chronological sort with `created_at_asc` — verifies oldest-first ordering.
 */
export async function test_api_role_search_by_name_and_paginate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fuzzy name search with "Manag" using trigram similarity
  const searchResult = await api.functional.erpHrm.roles.index(connection, {
    body: { search: "Manag" } satisfies IErpHrmRole.IRequest,
  });
  typia.assert(searchResult);
  TestValidator.predicate(
    "search includes Manager role",
    searchResult.data.some((role) => role.name === "Manager"),
  );
  TestValidator.predicate(
    "search excludes Owner role",
    !searchResult.data.some((role) => role.name === "Owner"),
  );
  TestValidator.predicate(
    "search excludes Employee role",
    !searchResult.data.some((role) => role.name === "Employee"),
  );
  // 2. Cursor-based pagination with created_at_desc sort
  const page1 = await api.functional.erpHrm.roles.index(connection, {
    body: {
      limit: 2,
      sort: "created_at_desc",
    } satisfies IErpHrmRole.IRequest,
  });
  typia.assert(page1);
  TestValidator.predicate("page 1 has at most 2 roles", page1.data.length <= 2);
  // Verify newest-first ordering within page 1
  for (let i = 1; i < page1.data.length; i++) {
    TestValidator.predicate(
      `page 1 created_at_desc order at index ${i}`,
      page1.data[i - 1].created_at >= page1.data[i].created_at,
    );
  }
  // 3. Second page using cursor from last role of page 1
  if (page1.data.length === 2) {
    const cursor = page1.data[page1.data.length - 1].created_at;
    const page2 = await api.functional.erpHrm.roles.index(connection, {
      body: {
        limit: 2,
        cursor,
        sort: "created_at_desc",
      } satisfies IErpHrmRole.IRequest,
    });
    typia.assert(page2);
    // No duplicates between pages
    const page1Ids = new Set(page1.data.map((r) => r.id));
    TestValidator.predicate(
      "page 2 contains no duplicates from page 1",
      page2.data.every((r) => !page1Ids.has(r.id)),
    );
    // All page 2 roles must have timestamps earlier than or equal to the cursor
    TestValidator.predicate(
      "page 2 roles have created_at <= cursor",
      page2.data.every((r) => r.created_at <= cursor),
    );
  }
  // 4. Sort by name_desc (reverse alphabetical, Z-A)
  const nameDescResult = await api.functional.erpHrm.roles.index(connection, {
    body: { sort: "name_desc" } satisfies IErpHrmRole.IRequest,
  });
  typia.assert(nameDescResult);
  for (let i = 1; i < nameDescResult.data.length; i++) {
    TestValidator.predicate(
      `name_desc Z-A order at index ${i}`,
      nameDescResult.data[i - 1].name >= nameDescResult.data[i].name,
    );
  }
  // 5. Sort by created_at_asc (oldest first)
  const createdAscResult = await api.functional.erpHrm.roles.index(connection, {
    body: { sort: "created_at_asc" } satisfies IErpHrmRole.IRequest,
  });
  typia.assert(createdAscResult);
  for (let i = 1; i < createdAscResult.data.length; i++) {
    TestValidator.predicate(
      `created_at_asc oldest-first order at index ${i}`,
      createdAscResult.data[i - 1].created_at <=
        createdAscResult.data[i].created_at,
    );
  }
}
