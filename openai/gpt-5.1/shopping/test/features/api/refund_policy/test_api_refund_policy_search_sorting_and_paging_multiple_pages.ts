import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

export async function test_api_refund_policy_search_sorting_and_paging_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Authenticate as platform admin
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a batch of refund policies (15+) with deterministic codes
  const createdPolicies: IShoppingMallRefundPolicy[] = [];
  const totalToCreate = 15;

  for (let i = 1; i <= totalToCreate; i++) {
    const indexStr = i.toString().padStart(3, "0");
    const code = `REFUND_CODE_${indexStr}`;
    const name = `Refund Policy ${indexStr}`;

    const now = new Date();
    const effectiveFrom = new Date(
      now.getTime() - 24 * 60 * 60 * 1000,
    ).toISOString();
    const effectiveUntil = new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();

    const body = {
      code,
      name,
      description: `Description for ${code}`,
      allowFullRefund: true,
      allowPartialRefund: true,
      refundWindowDays: 30,
      maxRefundRate: 1.0,
      requireManualApprovalOverAmount: 100000,
      configurationPayload: undefined,
      isActive: true,
      effectiveFrom,
      effectiveUntil,
      regionCode: null,
      policySettingCode: null,
    } satisfies IShoppingMallRefundPolicy.ICreate;

    const policy =
      await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallRefundPolicy>(policy);
    createdPolicies.push(policy);
  }

  // Sort created codes ascending for later comparison
  const createdCodesAsc: string[] = createdPolicies
    .map((p) => p.code)
    .slice()
    .sort();

  // Helper: set of created codes for quick lookup
  const createdCodeSet = new Set(createdCodesAsc);

  const filterCreated = (
    items: IShoppingMallRefundPolicy.ISummary[],
  ): IShoppingMallRefundPolicy.ISummary[] =>
    items.filter((item) => createdCodeSet.has(item.code));

  const assertAscending = (title: string, codes: string[]): void => {
    for (let i = 1; i < codes.length; i++) {
      TestValidator.predicate(
        `${title} - ascending at index ${i}`,
        codes[i - 1] <= codes[i],
      );
    }
  };

  const assertDescending = (title: string, codes: string[]): void => {
    for (let i = 1; i < codes.length; i++) {
      TestValidator.predicate(
        `${title} - descending at index ${i}`,
        codes[i - 1] >= codes[i],
      );
    }
  };

  // 3. Page 1 ASC
  const searchPage1Body = {
    page: 1,
    limit: 5,
    orderBy: "code",
    orderDirection: "asc",
  } satisfies IShoppingMallRefundPolicy.IRequest;

  const page1: IPageIShoppingMallRefundPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.index(
      connection,
      { body: searchPage1Body },
    );
  typia.assert<IPageIShoppingMallRefundPolicy.ISummary>(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // Pagination sanity checks (tolerant of pre-existing data)
  TestValidator.predicate(
    "page1 - records should be at least created count",
    pagination1.records >= createdPolicies.length,
  );
  TestValidator.predicate(
    "page1 - limit should be at least requested 5",
    pagination1.limit >= 5,
  );
  TestValidator.predicate(
    "page1 - pages should be consistent with records and limit",
    pagination1.pages === 0
      ? pagination1.records === 0
      : pagination1.pages >=
          Math.ceil(pagination1.records / Math.max(1, pagination1.limit)),
  );

  TestValidator.predicate(
    "page1 - data length between 0 and limit",
    data1.length >= 0 && data1.length <= pagination1.limit,
  );

  const page1Created = filterCreated(data1);
  const page1Codes = page1Created.map((p) => p.code);

  assertAscending("page1 - created codes ascending", page1Codes);

  const expectedPage1Codes = createdCodesAsc.slice(0, 5);
  TestValidator.equals(
    "page1 - created codes should match first 5 created codes (subset)",
    expectedPage1Codes,
    page1Codes,
  );

  // 4. Page 2 ASC
  const searchPage2Body = {
    page: 2,
    limit: 5,
    orderBy: "code",
    orderDirection: "asc",
  } satisfies IShoppingMallRefundPolicy.IRequest;

  const page2: IPageIShoppingMallRefundPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.index(
      connection,
      { body: searchPage2Body },
    );
  typia.assert<IPageIShoppingMallRefundPolicy.ISummary>(page2);

  const data2 = page2.data;
  TestValidator.predicate(
    "page2 - data length between 0 and limit",
    data2.length >= 0 && data2.length <= page2.pagination.limit,
  );

  const page2Created = filterCreated(data2);
  const page2Codes = page2Created.map((p) => p.code);

  assertAscending("page2 - created codes ascending", page2Codes);

  const expectedPage2Codes = createdCodesAsc.slice(5, 10);
  TestValidator.equals(
    "page2 - created codes should match next 5 created codes (subset)",
    expectedPage2Codes,
    page2Codes,
  );

  // Ensure no overlap between page1 and page2 created codes
  const overlap = page1Codes.filter((code) => page2Codes.includes(code));
  TestValidator.equals(
    "page1 & page2 - no overlapping created codes",
    overlap.length,
    0,
  );

  // 5. Descending order check on page 1
  const searchDescPage1Body = {
    page: 1,
    limit: 5,
    orderBy: "code",
    orderDirection: "desc",
  } satisfies IShoppingMallRefundPolicy.IRequest;

  const descPage1: IPageIShoppingMallRefundPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.index(
      connection,
      { body: searchDescPage1Body },
    );
  typia.assert<IPageIShoppingMallRefundPolicy.ISummary>(descPage1);

  const descPage1Created = filterCreated(descPage1.data);
  const descPage1Codes = descPage1Created.map((p) => p.code);

  assertDescending("desc page1 - created codes descending", descPage1Codes);

  const createdCodesDesc = createdCodesAsc.slice().sort().reverse();
  const expectedDescPage1Codes = createdCodesDesc.slice(0, 5);
  TestValidator.equals(
    "desc page1 - created codes should match top 5 created codes in desc order (subset)",
    expectedDescPage1Codes,
    descPage1Codes,
  );
}
