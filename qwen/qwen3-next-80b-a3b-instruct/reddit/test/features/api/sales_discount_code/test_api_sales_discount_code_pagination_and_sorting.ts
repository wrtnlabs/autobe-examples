import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleDiscountCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleDiscountCode";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSaleDiscountCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSaleDiscountCode";
export async function test_api_sales_discount_code_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Generate multiple discount codes for testing
  const discountCodes: ICommunityPlatformSaleDiscountCode.ISummary[] = [];
  // Create distinct discount codes for various sorting scenarios
  for (let i = 0; i < 25; i++) {
    // Generate a unique code
    const code = `DISCOUNT${i}${RandomGenerator.alphaNumeric(3)}`;
    // Create a discount with varying usage counts (0-20)
    const usageCount = i % 21;
    // Generate creation dates spanning a range (past 30 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (30 - i));
    const createdAt = startDate.toISOString();
    // Alternate between fixed amount and percentage discount types
    const discountAmount = i % 2 === 0 ? 10 + i * 5 : 0; // Fixed amount
    const discountPercentage = i % 2 !== 0 ? 5 + i * 2 : 0; // Percentage
    // Create the discount code
    const discountCode: ICommunityPlatformSaleDiscountCode.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      code,
      discountAmount,
      discountPercentage,
      minPurchaseAmount: 25,
      maxDiscountAmount: 100,
      usageLimit: 50,
      redemptionCount: usageCount,
      isActive: true,
      isValid: true,
      startDate: new Date().toISOString(), // Today for simplicity
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days in future
      appliesToCategory: "general",
      appliesToProduct: "",
      targetAudience: "allUsers",
      couponGroup: "test-group",
      createdAt,
    };
    discountCodes.push(discountCode);
  }
  // Create a base connection for API calls
  const adminConnection: api.IConnection = { host: connection.host };
  // Sort all discount codes by code for reference
  const sortedByCode = [...discountCodes].sort((a, b) =>
    a.code.localeCompare(b.code),
  );
  // Sort all discount codes by created_at for reference
  const sortedByCreatedAt = [...discountCodes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  // Sort all discount codes by usage_count for reference
  const sortedByUsageCount = [...discountCodes].sort(
    (a, b) => a.redemptionCount - b.redemptionCount,
  );
  // Test pagination with different limits
  const limits = [5, 10, 15, 25];
  for (const limit of limits) {
    const expectedPages = Math.ceil(discountCodes.length / limit);
    // Test each page
    for (let page = 1; page <= expectedPages; page++) {
      const response: IPageICommunityPlatformSaleDiscountCode.ISummary =
        await api.functional.communityPlatform.salesdiscountcodes.index(
          adminConnection,
          {
            body: {
              page,
              limit,
            } satisfies ICommunityPlatformSaleDiscountCode.IRequest,
          },
        );
      // Validate pagination metadata
      TestValidator.equals(
        "page number matches",
        response.pagination.current,
        page,
      );
      TestValidator.equals("limit matches", response.pagination.limit, limit);
      TestValidator.equals(
        "total records match",
        response.pagination.records,
        discountCodes.length,
      );
      TestValidator.equals(
        "total pages match",
        response.pagination.pages,
        expectedPages,
      );
      // Validate returned data items
      const expectedCount = Math.min(
        limit,
        discountCodes.length - (page - 1) * limit,
      );
      TestValidator.equals(
        "number of items on page matches",
        response.data.length,
        expectedCount,
      );
    }
  }
  // Test sorting by code (ascending)
  const responseCodeAsc: IPageICommunityPlatformSaleDiscountCode.ISummary =
    await api.functional.communityPlatform.salesdiscountcodes.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: discountCodes.length,
          sort_by: "code",
          order: "asc",
        } satisfies ICommunityPlatformSaleDiscountCode.IRequest,
      },
    );
  // Assert that the returned codes are ordered alphabetically
  for (let i = 0; i < responseCodeAsc.data.length; i++) {
    TestValidator.equals(
      `code at position ${i} matches sorted order`,
      responseCodeAsc.data[i].code,
      sortedByCode[i].code,
    );
  }
  // Test sorting by code (descending)
  const responseCodeDesc: IPageICommunityPlatformSaleDiscountCode.ISummary =
    await api.functional.communityPlatform.salesdiscountcodes.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: discountCodes.length,
          sort_by: "code",
          order: "desc",
        } satisfies ICommunityPlatformSaleDiscountCode.IRequest,
      },
    );
  // Assert that the returned codes are ordered in reverse alphabetical order
  for (let i = 0; i < responseCodeDesc.data.length; i++) {
    TestValidator.equals(
      `code at position ${i} matches reverse sorted order`,
      responseCodeDesc.data[i].code,
      sortedByCode[sortedByCode.length - 1 - i].code,
    );
  }
  // Test sorting by created_at (ascending)
  const responseCreatedAtAsc: IPageICommunityPlatformSaleDiscountCode.ISummary =
    await api.functional.communityPlatform.salesdiscountcodes.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: discountCodes.length,
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformSaleDiscountCode.IRequest,
      },
    );
  // Assert that the returned codes are ordered by creation date ascending
  for (let i = 0; i < responseCreatedAtAsc.data.length; i++) {
    TestValidator.equals(
      `creation date at position ${i} matches sorted order`,
      responseCreatedAtAsc.data[i].createdAt,
      sortedByCreatedAt[i].createdAt,
    );
  }
  // Test sorting by created_at (descending)
  const responseCreatedAtDesc: IPageICommunityPlatformSaleDiscountCode.ISummary =
    await api.functional.communityPlatform.salesdiscountcodes.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: discountCodes.length,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformSaleDiscountCode.IRequest,
      },
    );
  // Assert that the returned codes are ordered by creation date descending
  for (let i = 0; i < responseCreatedAtDesc.data.length; i++) {
    TestValidator.equals(
      `creation date at position ${i} matches reverse sorted order`,
      responseCreatedAtDesc.data[i].createdAt,
      sortedByCreatedAt[sortedByCreatedAt.length - 1 - i].createdAt,
    );
  }
  // Test sorting by usage_count (ascending)
  const responseUsageAsc: IPageICommunityPlatformSaleDiscountCode.ISummary =
    await api.functional.communityPlatform.salesdiscountcodes.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: discountCodes.length,
          sort_by: "usage_count",
          order: "asc",
        } satisfies ICommunityPlatformSaleDiscountCode.IRequest,
      },
    );
  // Assert that the returned codes are ordered by usage count ascending
  for (let i = 0; i < responseUsageAsc.data.length; i++) {
    TestValidator.equals(
      `usage count at position ${i} matches sorted order`,
      responseUsageAsc.data[i].redemptionCount,
      sortedByUsageCount[i].redemptionCount,
    );
  }
  // Test sorting by usage_count (descending)
  const responseUsageDesc: IPageICommunityPlatformSaleDiscountCode.ISummary =
    await api.functional.communityPlatform.salesdiscountcodes.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: discountCodes.length,
          sort_by: "usage_count",
          order: "desc",
        } satisfies ICommunityPlatformSaleDiscountCode.IRequest,
      },
    );
  // Assert that the returned codes are ordered by usage count descending
  for (let i = 0; i < responseUsageDesc.data.length; i++) {
    TestValidator.equals(
      `usage count at position ${i} matches reverse sorted order`,
      responseUsageDesc.data[i].redemptionCount,
      sortedByUsageCount[sortedByUsageCount.length - 1 - i].redemptionCount,
    );
  }
  // Verify that typia.assert() validates responses with proper types
  typia.assert(responseCodeAsc);
  typia.assert(responseCodeDesc);
  typia.assert(responseCreatedAtAsc);
  typia.assert(responseCreatedAtDesc);
  typia.assert(responseUsageAsc);
  typia.assert(responseUsageDesc);
}
