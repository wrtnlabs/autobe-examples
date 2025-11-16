import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostType";

export async function test_api_platform_admin_post_type_index_filter_by_code_and_enabled(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and start an authenticated session
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create three distinct post types (A, B, C)
  const createA = {
    code: "text",
    name: "Text",
    description: "Plain text posts",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postTypeA: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: createA },
    );
  typia.assert(postTypeA);

  const createB = {
    code: "image",
    name: "Image",
    description: "Image posts",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postTypeB: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: createB },
    );
  typia.assert(postTypeB);

  const createC = {
    code: "textalt",
    name: "Text Alt",
    description: "Alternative text posts",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postTypeC: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: createC },
    );
  typia.assert(postTypeC);

  // Helper to find specific codes in result data
  const extractCodes = (
    page: IPageICommunityPlatformPostType.ISummary,
  ): string[] => page.data.map((pt) => pt.code);

  // 3. Scenario 1: filter by exact code "text"
  const requestByCode = {
    code: "text",
    page: 1,
    pageSize: 50,
  } satisfies ICommunityPlatformPostType.IRequest;

  const pageByCode: IPageICommunityPlatformPostType.ISummary =
    await api.functional.communityPlatform.platformAdmin.postTypes.index(
      connection,
      { body: requestByCode },
    );
  typia.assert(pageByCode);

  const codesByCode = extractCodes(pageByCode);

  TestValidator.predicate(
    "filter by exact code 'text' must return at least one result",
    codesByCode.includes("text"),
  );

  // When filtering by exact code, it should not return postTypeB or C if
  // backend uses strict equality on code.
  TestValidator.predicate(
    "filter by code 'text' should not include 'image' or 'textalt' codes",
    codesByCode.every((code) => code === "text"),
  );

  // Ensure pagination metadata is consistent with page and pageSize
  const paginationByCode = pageByCode.pagination;
  TestValidator.predicate(
    "pagination.limit matches requested pageSize in code filter",
    paginationByCode.limit === requestByCode.pageSize,
  );
  TestValidator.predicate(
    "pagination.current is 1 in code filter",
    paginationByCode.current === requestByCode.page,
  );
  TestValidator.predicate(
    "pagination.records is at least number of returned elements in code filter",
    paginationByCode.records >= pageByCode.data.length,
  );

  // 4. Scenario 2: search by substring on name to find Image only
  const searchTermImage = "Image";
  const requestSearchImage = {
    search: searchTermImage,
    page: 1,
    pageSize: 50,
  } satisfies ICommunityPlatformPostType.IRequest;

  const pageSearchImage: IPageICommunityPlatformPostType.ISummary =
    await api.functional.communityPlatform.platformAdmin.postTypes.index(
      connection,
      { body: requestSearchImage },
    );
  typia.assert(pageSearchImage);

  const codesSearchImage = extractCodes(pageSearchImage);

  TestValidator.predicate(
    "search for 'Image' should include code 'image'",
    codesSearchImage.includes(postTypeB.code),
  );

  TestValidator.predicate(
    "search for 'Image' should not necessarily include text-type variants",
    !codesSearchImage.includes(postTypeC.code) ||
      !pageSearchImage.data.some((pt) => pt.name === postTypeC.name),
  );

  // 5. Scenario 3: search by description substring that matches A and C
  const searchTermText = "text";
  const requestSearchText = {
    search: searchTermText,
    page: 1,
    pageSize: 50,
  } satisfies ICommunityPlatformPostType.IRequest;

  const pageSearchText: IPageICommunityPlatformPostType.ISummary =
    await api.functional.communityPlatform.platformAdmin.postTypes.index(
      connection,
      { body: requestSearchText },
    );
  typia.assert(pageSearchText);

  const codesSearchText = extractCodes(pageSearchText);

  TestValidator.predicate(
    "search for 'text' should include code 'text' (A)",
    codesSearchText.includes(postTypeA.code),
  );
  TestValidator.predicate(
    "search for 'text' should include code 'textalt' (C)",
    codesSearchText.includes(postTypeC.code),
  );

  // 6. Scenario 4: sorting by code asc/desc
  const requestSortAsc = {
    sortBy: "code",
    sortOrder: "asc",
    page: 1,
    pageSize: 50,
  } satisfies ICommunityPlatformPostType.IRequest;

  const pageSortAsc: IPageICommunityPlatformPostType.ISummary =
    await api.functional.communityPlatform.platformAdmin.postTypes.index(
      connection,
      { body: requestSortAsc },
    );
  typia.assert(pageSortAsc);

  const ascCodes = extractCodes(pageSortAsc);

  // Extract subset of interest [image, text, textalt] that actually appear
  const targetCodes = [postTypeB.code, postTypeA.code, postTypeC.code];
  const ascSubset = ascCodes.filter((code) => targetCodes.includes(code));
  const ascSorted = [...ascSubset].sort((x, y) => x.localeCompare(y));

  TestValidator.equals(
    "ascending sort by code must order codes lexicographically",
    ascSubset,
    ascSorted,
  );

  const requestSortDesc = {
    sortBy: "code",
    sortOrder: "desc",
    page: 1,
    pageSize: 50,
  } satisfies ICommunityPlatformPostType.IRequest;

  const pageSortDesc: IPageICommunityPlatformPostType.ISummary =
    await api.functional.communityPlatform.platformAdmin.postTypes.index(
      connection,
      { body: requestSortDesc },
    );
  typia.assert(pageSortDesc);

  const descCodes = extractCodes(pageSortDesc);
  const descSubset = descCodes.filter((code) => targetCodes.includes(code));
  const descSorted = [...descSubset].sort((x, y) => y.localeCompare(x));

  TestValidator.equals(
    "descending sort by code must order codes in reverse lexicographical order",
    descSubset,
    descSorted,
  );
}
