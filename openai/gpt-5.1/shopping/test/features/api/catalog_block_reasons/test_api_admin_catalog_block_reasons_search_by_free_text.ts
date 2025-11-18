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
 * Validate free-text search for catalog block reasons.
 *
 * Business goal: Ensure that an authenticated admin can search catalog block
 * reasons via the `search` field of `IShoppingMallCatalogBlockReason.IRequest`,
 * and that the search uses key descriptive fields (at least name/description)
 * to include matching reasons while excluding non-matching ones.
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Create two catalog block reasons via POST
 *    /shoppingMall/admin/catalogBlockReasons:
 *
 *    - Reason A: contains a distinctive phrase like "counterfeit suspected" in its
 *         name/description.
 *    - Reason B: does not contain that phrase anywhere.
 * 3. Call PATCH /shoppingMall/admin/catalogBlockReasons with IRequest.search set
 *    to the distinctive phrase and a sufficiently large limit.
 * 4. Assert that:
 *
 *    - The response type matches IPageIShoppingMallCatalogBlockReason.ISummary.
 *    - Pagination fields are consistent (current, limit, records, pages).
 *    - The data array contains Reason A (matched by code/name).
 *    - The data array does NOT contain Reason B.
 * 5. Optionally, repeat the search with different casing of the phrase to confirm
 *    case-insensitive behavior if supported.
 */
export async function test_api_admin_catalog_block_reasons_search_by_free_text(
  connection: api.IConnection,
) {
  // 1. Admin registration to establish authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed catalog block reasons
  const uniquePhrase = "counterfeit suspected";

  // Reason A: includes the unique phrase in name and/or description
  const reasonABody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    name: `Reason A - ${uniquePhrase}`,
    description: `This reason is used when ${uniquePhrase} in product listing.`,
    severity_level: "high",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const reasonA: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: reasonABody,
      },
    );
  typia.assert(reasonA);

  // Reason B: does NOT include the unique phrase
  const reasonBBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    name: "Reason B - generic quality issue",
    description: "Used for generic quality issues unrelated to counterfeit.",
    severity_level: "low",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const reasonB: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: reasonBBody,
      },
    );
  typia.assert(reasonB);

  // 3. Execute search with the distinctive phrase
  const searchRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    search: uniquePhrase,
  } satisfies IShoppingMallCatalogBlockReason.IRequest;

  const pageResult: IPageIShoppingMallCatalogBlockReason.ISummary =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination and filtering behavior
  const pagination = pageResult.pagination;
  TestValidator.equals(
    "pagination current page should match request page",
    searchRequest.page,
    pagination.current,
  );
  TestValidator.equals(
    "pagination limit should match request limit",
    searchRequest.limit,
    pagination.limit,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed pagination limit",
    pageResult.data.length <= pagination.limit,
  );

  // Ensure Reason A is present in the search results
  const containsReasonA = pageResult.data.some(
    (summary) => summary.code === reasonA.code && summary.name === reasonA.name,
  );
  TestValidator.predicate(
    "search result should contain Reason A with matching code and name",
    containsReasonA,
  );

  // Ensure Reason B is NOT present in the search results
  const containsReasonB = pageResult.data.some(
    (summary) => summary.code === reasonB.code && summary.name === reasonB.name,
  );
  TestValidator.predicate(
    "search result should NOT contain Reason B with non-matching phrase",
    !containsReasonB,
  );

  // 5. Optional case-insensitivity check
  const upperCaseSearch = uniquePhrase.toUpperCase();
  const caseInsensitiveRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    search: upperCaseSearch,
  } satisfies IShoppingMallCatalogBlockReason.IRequest;

  const caseInsensitiveResult: IPageIShoppingMallCatalogBlockReason.ISummary =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      {
        body: caseInsensitiveRequest,
      },
    );
  typia.assert(caseInsensitiveResult);

  const containsReasonAWithCaseChange = caseInsensitiveResult.data.some(
    (summary) => summary.code === reasonA.code && summary.name === reasonA.name,
  );
  TestValidator.predicate(
    "case-insensitive search should still find Reason A",
    containsReasonAWithCaseChange,
  );

  const containsReasonBWithCaseChange = caseInsensitiveResult.data.some(
    (summary) => summary.code === reasonB.code && summary.name === reasonB.name,
  );
  TestValidator.predicate(
    "case-insensitive search should still NOT include Reason B",
    !containsReasonBWithCaseChange,
  );
}
