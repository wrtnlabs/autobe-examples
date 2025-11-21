import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleTag";
import type { IShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleTag";

/**
 * Test article tag visibility filtering for administrative and customer-facing
 * interfaces.
 *
 * This test validates the ability to filter article tags by visibility status,
 * supporting different user interface needs where customers see only public
 * tags while administrators need access to both visible and hidden tags in
 * backend systems.
 *
 * Test flow:
 *
 * 1. Retrieve all article tags without visibility filter to establish baseline
 * 2. Filter tags by visible: true to simulate customer-facing interface
 * 3. Filter tags by visible: false to simulate admin interface for hidden tags
 * 4. Verify pagination and total counts are correct for each filter
 * 5. Test combined filters with search and visibility
 */
export async function test_api_articletag_filter_by_visibility_status(
  connection: api.IConnection,
) {
  // Step 1: Retrieve all article tags to establish baseline
  const allTagsRequest = {
    visible: undefined, // No visibility filter
    page: 1,
    limit: 100,
  } satisfies IShoppingMallArticleTag.IRequest;

  const allTagsPage = await api.functional.shoppingMall.articleTags.index(
    connection,
    { body: allTagsRequest },
  );

  typia.assert(allTagsPage);
  TestValidator.equals(
    "all tags retrieval succeeds",
    allTagsPage.pagination.current,
    1,
  );

  // Verify we have some tags to work with
  if (allTagsPage.data.length === 0) {
    TestValidator.predicate("has at least some tags", false);
    return; // Cannot test filtering if no tags exist
  }

  // Count visible and hidden tags in baseline
  const visibleTagsCount = allTagsPage.data.filter((tag) => tag.visible).length;
  const hiddenTagsCount = allTagsPage.data.filter((tag) => !tag.visible).length;

  TestValidator.equals(
    "total tags count matches",
    allTagsPage.data.length,
    visibleTagsCount + hiddenTagsCount,
  );

  // Step 2: Filter tags by visible: true (customer-facing interface scenario)
  const visibleOnlyRequest = {
    visible: true,
    page: 1,
    limit: 100,
  } satisfies IShoppingMallArticleTag.IRequest;

  const visibleResults = await api.functional.shoppingMall.articleTags.index(
    connection,
    { body: visibleOnlyRequest },
  );

  typia.assert(visibleResults);
  TestValidator.equals(
    "visible-only filter current page",
    visibleResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "visible-only filter total records",
    visibleResults.pagination.records,
    visibleTagsCount,
  );

  // Verify all returned tags are visible
  visibleResults.data.forEach((tag, index) => {
    TestValidator.equals(
      `visible tag ${index} has visible: true`,
      tag.visible,
      true,
    );
  });

  // Step 3: Filter tags by visible: false (admin interface for hidden content)
  const hiddenOnlyRequest = {
    visible: false,
    page: 1,
    limit: 100,
  } satisfies IShoppingMallArticleTag.IRequest;

  const hiddenResults = await api.functional.shoppingMall.articleTags.index(
    connection,
    { body: hiddenOnlyRequest },
  );

  typia.assert(hiddenResults);
  TestValidator.equals(
    "hidden-only filter current page",
    hiddenResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "hidden-only filter total records",
    hiddenResults.pagination.records,
    hiddenTagsCount,
  );

  // Verify all returned tags are hidden
  hiddenResults.data.forEach((tag, index) => {
    TestValidator.equals(
      `hidden tag ${index} has visible: false`,
      tag.visible,
      false,
    );
  });

  // Step 4: Test pagination with visibility filtering
  const limitedVisibleRequest = {
    visible: true,
    page: 1,
    limit: 5,
  } satisfies IShoppingMallArticleTag.IRequest;

  const limitedVisibleResults =
    await api.functional.shoppingMall.articleTags.index(connection, {
      body: limitedVisibleRequest,
    });

  typia.assert(limitedVisibleResults);
  TestValidator.equals(
    "limited results respect page limit",
    limitedVisibleResults.data.length,
    Math.min(visibleTagsCount, 5),
  );
  TestValidator.equals(
    "limited results all visible",
    limitedVisibleResults.data.every((tag) => tag.visible),
    true,
  );

  // Step 5: Test combined filters - search + visibility
  if (allTagsPage.data.length > 0) {
    const sampleTag =
      allTagsPage.data.find((tag) => tag.visible) || allTagsPage.data[0];
    const searchAndVisibleRequest = {
      search: sampleTag.name.substring(0, 3), // Partial name search
      visible: sampleTag.visible,
      page: 1,
      limit: 20,
    } satisfies IShoppingMallArticleTag.IRequest;

    const searchResults = await api.functional.shoppingMall.articleTags.index(
      connection,
      { body: searchAndVisibleRequest },
    );

    typia.assert(searchResults);

    // All results should match the visibility criteria
    searchResults.data.forEach((tag, index) => {
      TestValidator.equals(
        `search result ${index} has correct visibility`,
        tag.visible,
        sampleTag.visible,
      );
      TestValidator.predicate(
        `search result ${index} name contains search term`,
        tag.name
          .toLowerCase()
          .includes(sampleTag.name.substring(0, 3).toLowerCase()),
      );
    });
  }

  // Final verification: total counts should be consistent
  TestValidator.equals(
    "visible + hidden = total",
    visibleResults.pagination.records + hiddenResults.pagination.records,
    allTagsPage.pagination.records,
  );
}
