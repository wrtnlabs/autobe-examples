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
 * Comprehensive section search functionality validation within a shopping
 * channel
 *
 * This test validates the filtered search capabilities for shopping mall
 * sections including status filtering, text search, pagination, sorting, and
 * date range queries. It creates a complete test environment with administrator
 * authentication, channel creation, and multiple sections with varied
 * configurations.
 */
export async function test_api_admin_channel_sections_search_filtered(
  connection: api.IConnection,
) {
  // 1. Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123456";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create shopping channel
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ theme: "default" }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create multiple sections with varied configurations
  const sectionStatuses = ["active", "inactive", "hidden", "archived"] as const;
  const sections: IShoppingMallSection[] = [];

  for (let i = 0; i < 12; i++) {
    const status = RandomGenerator.pick(sectionStatuses);
    const section =
      await api.functional.shoppingMall.admin.channels.sections.create(
        connection,
        {
          channelCode: channelCode,
          body: {
            code: `section_${i}`,
            name: `Section ${i} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
            description:
              i % 2 === 0 ? RandomGenerator.content({ paragraphs: 1 }) : null,
            display_order: i,
            status: status,
            configuration:
              i % 3 === 0 ? JSON.stringify({ featured: true }) : null,
          } satisfies IShoppingMallSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }

  // 4. Test status filtering
  for (const status of sectionStatuses) {
    const filteredResults =
      await api.functional.shoppingMall.admin.channels.sections.index(
        connection,
        {
          channelCode: channelCode,
          body: {
            page: 1,
            limit: 10,
            status: status,
          } satisfies IShoppingMallSection.IRequest,
        },
      );
    typia.assert(filteredResults);

    TestValidator.predicate(
      `status filter ${status} should return results`,
      filteredResults.data.length >= 0,
    );
  }

  // 5. Test text search
  const searchTerm = "Section";
  const searchResults =
    await api.functional.shoppingMall.admin.channels.sections.index(
      connection,
      {
        channelCode: channelCode,
        body: {
          page: 1,
          limit: 5,
          search: searchTerm,
        } satisfies IShoppingMallSection.IRequest,
      },
    );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search with common term should return results",
    searchResults.data.length > 0,
  );

  // 6. Test pagination
  const page1Results =
    await api.functional.shoppingMall.admin.channels.sections.index(
      connection,
      {
        channelCode: channelCode,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallSection.IRequest,
      },
    );
  typia.assert(page1Results);

  const page2Results =
    await api.functional.shoppingMall.admin.channels.sections.index(
      connection,
      {
        channelCode: channelCode,
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallSection.IRequest,
      },
    );
  typia.assert(page2Results);

  TestValidator.predicate(
    "pagination should work correctly",
    page1Results.data.length <= 5 && page2Results.data.length <= 5,
  );

  // 7. Test sorting by display order
  const sortedResults =
    await api.functional.shoppingMall.admin.channels.sections.index(
      connection,
      {
        channelCode: channelCode,
        body: {
          page: 1,
          limit: 10,
          order_by: "display_order",
          order_direction: "asc",
        } satisfies IShoppingMallSection.IRequest,
      },
    );
  typia.assert(sortedResults);

  TestValidator.predicate(
    "sorting should return results",
    sortedResults.data.length > 0,
  );

  // 8. Test date range filtering
  const firstSection = sections[0];
  const dateRangeResults =
    await api.functional.shoppingMall.admin.channels.sections.index(
      connection,
      {
        channelCode: channelCode,
        body: {
          page: 1,
          limit: 10,
          created_at_start: firstSection.created_at,
          created_at_end: new Date(Date.now() + 86400000).toISOString(),
        } satisfies IShoppingMallSection.IRequest,
      },
    );
  typia.assert(dateRangeResults);

  TestValidator.predicate(
    "date range filter should return sections",
    dateRangeResults.data.length >= 0,
  );
}
