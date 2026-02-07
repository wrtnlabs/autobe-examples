import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection for section management
  const adminConnection: api.IConnection = { host: connection.host };
  // Note: In a real implementation, we would need to authenticate as admin
  // Since no admin authentication utility exists, we'll test with the assumption
  // that the endpoint allows access for testing purposes
  // Test filtering by each status type
  const statuses: Array<"active" | "inactive" | "archived"> = [
    "active",
    "inactive",
    "archived",
  ];
  for (const status of statuses) {
    // Test with specific status filter
    const response = await api.functional.discussionBoard.sections.index(
      adminConnection,
      {
        body: {
          status: status,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
    typia.assert(response);
    // Validate that all returned sections have the requested status
    TestValidator.predicate(
      `all sections should have status ${status}`,
      response.data.every((section) => section.status === status),
    );
    // Validate pagination metadata
    TestValidator.predicate(
      `pagination current page should be positive`,
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      `pagination limit should be positive`,
      response.pagination.limit >= 1,
    );
    TestValidator.predicate(
      `pagination records should be non-negative`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages should be non-negative`,
      response.pagination.pages >= 0,
    );
  }
  // Test without status filter (should return sections with any status)
  const allSectionsResponse =
    await api.functional.discussionBoard.sections.index(adminConnection, {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(allSectionsResponse);
  // Validate pagination metadata for unfiltered request
  TestValidator.predicate(
    "unfiltered pagination current page should be positive",
    allSectionsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "unfiltered pagination limit should be positive",
    allSectionsResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "unfiltered pagination records should be non-negative",
    allSectionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "unfiltered pagination pages should be non-negative",
    allSectionsResponse.pagination.pages >= 0,
  );
  // Test combination of status filter with search
  const searchTerm = RandomGenerator.alphabets(5);
  const searchResponse = await api.functional.discussionBoard.sections.index(
    adminConnection,
    {
      body: {
        status: "active",
        search: searchTerm,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate that search response contains valid sections
  TestValidator.predicate(
    "search response should have valid sections",
    searchResponse.data.every(
      (section) =>
        typeof section.id === "string" &&
        typeof section.name === "string" &&
        typeof section.status === "string" &&
        typeof section.display_order === "number",
    ),
  );
}
