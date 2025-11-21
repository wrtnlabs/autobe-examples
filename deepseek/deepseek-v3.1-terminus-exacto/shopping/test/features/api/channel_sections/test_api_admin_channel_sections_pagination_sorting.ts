import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate pagination and sorting functionality for section listings within a
 * shopping mall channel.
 *
 * This comprehensive test creates an administrator account, establishes a
 * channel, generates multiple sections with controlled properties, and
 * systematically tests pagination controls with different page sizes while
 * validating record counts. It also tests sorting by display order, creation
 * date, name, and update timestamp in both ascending and descending directions
 * to ensure proper ordering behavior for administrative section management
 * interfaces.
 */
export async function test_api_admin_channel_sections_pagination_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: RandomGenerator.paragraph({ sentences: 2 }),
        last_name: RandomGenerator.paragraph({ sentences: 2 }),
        role: "super_admin",
        permissions: JSON.stringify({ access_level: "full" }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a channel to contain test sections
  const channelCode = RandomGenerator.alphaNumeric(10);
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: channelCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        configuration: JSON.stringify({ theme: "default" }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create multiple sections for pagination and sorting testing
  const sectionCount = 15;
  const sections: IShoppingMallSection[] = [];

  for (let i = 0; i < sectionCount; i++) {
    const section: IShoppingMallSection =
      await api.functional.shoppingMall.admin.channels.sections.create(
        connection,
        {
          channelCode: channelCode,
          body: {
            code: `section_${i}_${RandomGenerator.alphaNumeric(5)}`,
            name: `Section ${i} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
            description: RandomGenerator.content({ paragraphs: 1 }),
            display_order: i,
            status: "active",
            configuration: JSON.stringify({ order: i }),
          } satisfies IShoppingMallSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);

    // Add small delay to ensure different timestamps for sorting tests
    if (i < sectionCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  // Step 4: Test pagination with different page sizes
  const pageSizes = [5, 10, 15] as const;

  for (const limit of pageSizes) {
    const pageResult: IPageIShoppingMallSection.ISummary =
      await api.functional.shoppingMall.admin.channels.sections.index(
        connection,
        {
          channelCode: channelCode,
          body: {
            page: 1,
            limit: typia.assert<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
            >(limit),
          } satisfies IShoppingMallSection.IRequest,
        },
      );
    typia.assert(pageResult);

    // Validate pagination metadata
    TestValidator.equals(
      `page ${limit} should have correct pagination metadata`,
      pageResult.pagination.current,
      1,
    );
    TestValidator.equals(
      `page ${limit} should have correct limit`,
      pageResult.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `page ${limit} should have correct total records`,
      pageResult.pagination.records,
      sectionCount,
    );
    TestValidator.predicate(
      `page ${limit} should have correct page count calculation`,
      pageResult.pagination.pages === Math.ceil(sectionCount / limit),
    );

    // Validate data count matches page size (or total if last page)
    TestValidator.equals(
      `page ${limit} should return correct number of sections`,
      pageResult.data.length,
      Math.min(limit, sectionCount),
    );
  }

  // Step 5: Test sorting by display_order (ascending and descending)
  const sortFields = [
    "display_order",
    "created_at",
    "name",
    "updated_at",
  ] as const;
  const directions = ["asc", "desc"] as const;

  for (const field of sortFields) {
    for (const direction of directions) {
      const sortedResult: IPageIShoppingMallSection.ISummary =
        await api.functional.shoppingMall.admin.channels.sections.index(
          connection,
          {
            channelCode: channelCode,
            body: {
              page: 1,
              limit: typia.assert<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
              >(sectionCount),
              order_by: field,
              order_direction: direction,
            } satisfies IShoppingMallSection.IRequest,
          },
        );
      typia.assert(sortedResult);

      // Validate sorting order
      TestValidator.equals(
        `sort by ${field} ${direction} should return all sections`,
        sortedResult.data.length,
        sectionCount,
      );

      // Verify sorting logic for different fields
      if (field === "display_order") {
        for (let i = 1; i < sortedResult.data.length; i++) {
          const current = sortedResult.data[i].display_order;
          const previous = sortedResult.data[i - 1].display_order;

          if (direction === "asc") {
            TestValidator.predicate(
              `display_order ascending order at position ${i}`,
              previous <= current,
            );
          } else {
            TestValidator.predicate(
              `display_order descending order at position ${i}`,
              previous >= current,
            );
          }
        }
      } else if (field === "name") {
        for (let i = 1; i < sortedResult.data.length; i++) {
          const current = sortedResult.data[i].name;
          const previous = sortedResult.data[i - 1].name;

          const comparison = previous.localeCompare(current);
          if (direction === "asc") {
            TestValidator.predicate(
              `name ascending order at position ${i}`,
              comparison <= 0,
            );
          } else {
            TestValidator.predicate(
              `name descending order at position ${i}`,
              comparison >= 0,
            );
          }
        }
      }
    }
  }

  // Step 6: Test pagination across multiple pages
  const multiPageLimit = 5;
  const expectedPages = Math.ceil(sectionCount / multiPageLimit);

  for (let page = 1; page <= expectedPages; page++) {
    const pageResult: IPageIShoppingMallSection.ISummary =
      await api.functional.shoppingMall.admin.channels.sections.index(
        connection,
        {
          channelCode: channelCode,
          body: {
            page: typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(
              page,
            ),
            limit: typia.assert<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
            >(multiPageLimit),
            order_by: "display_order",
            order_direction: "asc",
          } satisfies IShoppingMallSection.IRequest,
        },
      );
    typia.assert(pageResult);

    TestValidator.equals(
      `multi-page test page ${page} current page`,
      pageResult.pagination.current,
      page,
    );

    const expectedItems =
      page === expectedPages
        ? sectionCount - multiPageLimit * (expectedPages - 1)
        : multiPageLimit;

    TestValidator.equals(
      `multi-page test page ${page} item count`,
      pageResult.data.length,
      expectedItems,
    );
  }

  // Step 7: Test search functionality with pagination
  const searchTerm = "Section";
  const searchResult: IPageIShoppingMallSection.ISummary =
    await api.functional.shoppingMall.admin.channels.sections.index(
      connection,
      {
        channelCode: channelCode,
        body: {
          page: 1,
          limit: typia.assert<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(sectionCount),
          search: searchTerm,
        } satisfies IShoppingMallSection.IRequest,
      },
    );
  typia.assert(searchResult);

  // Verify search results contain the search term
  TestValidator.predicate(
    "search should return matching sections",
    searchResult.data.some((section) =>
      section.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  // Step 8: Test status filtering with pagination
  const statusResult: IPageIShoppingMallSection.ISummary =
    await api.functional.shoppingMall.admin.channels.sections.index(
      connection,
      {
        channelCode: channelCode,
        body: {
          page: 1,
          limit: typia.assert<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(sectionCount),
          status: "active",
        } satisfies IShoppingMallSection.IRequest,
      },
    );
  typia.assert(statusResult);

  TestValidator.equals(
    "status filter should return correct number of active sections",
    statusResult.data.length,
    sectionCount, // All sections created are active
  );
}
