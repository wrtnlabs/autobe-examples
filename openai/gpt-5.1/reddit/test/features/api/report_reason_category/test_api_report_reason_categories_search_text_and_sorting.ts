import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportReasonCategory";

/**
 * Validate free-text search and sorting for report reason categories as a
 * platform admin.
 *
 * Business context: Platform administrators manage a catalog of standardized
 * report reason categories (like "spam", "harassment", etc.) that are used when
 * end users or moderators report content. The admin UI needs a search and
 * listing endpoint that supports free-text search over `name` and
 * `description`, along with flexible sorting options and pagination, so that
 * admins can quickly find and verify categories.
 *
 * This test verifies that PATCH
 * /communityPlatform/platformAdmin/reportReasonCategories behaves as expected
 * when combined with search and sort parameters.
 *
 * High-level flow:
 *
 * 1. Join as a platform admin to establish an authenticated context.
 * 2. Seed multiple report reason categories with distinctive names and
 *    descriptions.
 * 3. Execute a search query for categories containing a specific term (e.g.
 *    "spam") and request sorting by `name` ascending.
 * 4. Assert that all returned categories in the page contain the search term and
 *    are correctly ordered by `name` ascending.
 * 5. Optionally, run an additional search using a different term (e.g.
 *    "harassment") and sort by `created_at` descending, ensuring that the
 *    newest matching category appears first.
 */
export async function test_api_report_reason_categories_search_text_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator to obtain an authenticated connection.
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Seed report reason categories with known search terms.
  // We'll create three distinct categories with controlled names/descriptions.
  const categoriesToCreate: ICommunityPlatformReportReasonCategory.ICreate[] = [
    {
      code: `spam_${RandomGenerator.alphaNumeric(6)}`,
      name: "Spam or misleading",
      description:
        "Reports for spam content, unsolicited promotions, or misleading links.",
      is_user_visible: true,
      is_active: true,
    },
    {
      code: `harassment_${RandomGenerator.alphaNumeric(6)}`,
      name: "Harassment and bullying",
      description:
        "Reports for harassment, bullying, or abusive behavior towards individuals.",
      is_user_visible: true,
      is_active: true,
    },
    {
      code: `self_harm_${RandomGenerator.alphaNumeric(6)}`,
      name: "Self-harm and suicide",
      description:
        "Reports for self-harm, suicidal ideation, or encouragement of self-injury.",
      is_user_visible: true,
      is_active: true,
    },
  ];

  const createdCategories: ICommunityPlatformReportReasonCategory[] = [];
  for (const body of categoriesToCreate) {
    const created =
      await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
        connection,
        {
          body: body satisfies ICommunityPlatformReportReasonCategory.ICreate,
        },
      );
    typia.assert<ICommunityPlatformReportReasonCategory>(created);
    createdCategories.push(created);
  }

  // Helper to perform search and return page results.
  const searchCategories = async (
    search: string | undefined,
    sortBy: string | undefined,
    sortDirection: string | undefined,
  ) => {
    const requestBody = {
      page: 0 as number & tags.Type<"int32">,
      pageSize: 10 as number & tags.Type<"int32">,
      search,
      sortBy,
      sortDirection,
    } satisfies ICommunityPlatformReportReasonCategory.IRequest;

    const page =
      await api.functional.communityPlatform.platformAdmin.reportReasonCategories.index(
        connection,
        { body: requestBody },
      );
    typia.assert<IPageICommunityPlatformReportReasonCategory.ISummary>(page);
    return page;
  };

  // 3. Search for spam-related categories, sorting by name ascending.
  const spamSearchTerm = "spam";
  const spamPage = await searchCategories("spam", "name", "asc");

  // 4. Business validations for spam search.
  const spamData = spamPage.data;

  // Ensure at least one result is returned for the spam term.
  TestValidator.predicate(
    "spam search should return at least one category",
    spamData.length > 0,
  );

  // Ensure all returned items contain the search term in name or description
  // (case-insensitive contains check).
  for (const item of spamData) {
    const lowerName = item.name.toLowerCase();
    const lowerDescription = item.description.toLowerCase();
    TestValidator.predicate(
      `category ${item.code} should match spam search term`,
      lowerName.includes(spamSearchTerm) ||
        lowerDescription.includes(spamSearchTerm),
    );
  }

  // Validate sorting by name ascending (lexicographical order).
  for (let i = 1; i < spamData.length; i++) {
    const prev = spamData[i - 1];
    const curr = spamData[i];
    TestValidator.predicate(
      "spam search results should be sorted by name ascending",
      prev.name.localeCompare(curr.name) <= 0,
    );
  }

  // Validate pagination metadata consistency.
  const spamPagination = spamPage.pagination;
  typia.assert<IPage.IPagination>(spamPagination);

  // records should be at least the number of results on this page.
  TestValidator.predicate(
    "pagination.records should be >= data.length for spam search",
    spamPagination.records >= spamData.length,
  );

  // limit should be at least the number of results on this page and match
  // requested pageSize (10) or a service-defined cap.
  TestValidator.predicate(
    "pagination.limit should be >= data.length for spam search",
    spamPagination.limit >= spamData.length,
  );

  // current should be non-negative and within [0, pages] range.
  TestValidator.predicate(
    "pagination.current should be within valid page range for spam search",
    spamPagination.current >= 0 &&
      spamPagination.current <= spamPagination.pages,
  );

  // 5. Optional: search harassment-related categories sorted by created_at desc.
  const harassmentSearchTerm = "harassment";
  const harassmentPage = await searchCategories(
    harassmentSearchTerm,
    "created_at",
    "desc",
  );
  const harassmentData = harassmentPage.data;

  // Ensure at least one harassment result.
  TestValidator.predicate(
    "harassment search should return at least one category",
    harassmentData.length > 0,
  );

  // Ensure all harassment results contain the term in name or description.
  for (const item of harassmentData) {
    const lowerName = item.name.toLowerCase();
    const lowerDescription = item.description.toLowerCase();
    TestValidator.predicate(
      `category ${item.code} should match harassment search term`,
      lowerName.includes(harassmentSearchTerm) ||
        lowerDescription.includes(harassmentSearchTerm),
    );
  }

  // Validate that data is ordered by created_at descending.
  for (let i = 1; i < harassmentData.length; i++) {
    const prev = harassmentData[i - 1];
    const curr = harassmentData[i];
    TestValidator.predicate(
      "harassment search results should be sorted by created_at descending",
      prev.created_at >= curr.created_at,
    );
  }

  const harassmentPagination = harassmentPage.pagination;
  typia.assert<IPage.IPagination>(harassmentPagination);

  TestValidator.predicate(
    "pagination.records should be >= data.length for harassment search",
    harassmentPagination.records >= harassmentData.length,
  );
  TestValidator.predicate(
    "pagination.limit should be >= data.length for harassment search",
    harassmentPagination.limit >= harassmentData.length,
  );
  TestValidator.predicate(
    "pagination.current should be within valid page range for harassment search",
    harassmentPagination.current >= 0 &&
      harassmentPagination.current <= harassmentPagination.pages,
  );
}
