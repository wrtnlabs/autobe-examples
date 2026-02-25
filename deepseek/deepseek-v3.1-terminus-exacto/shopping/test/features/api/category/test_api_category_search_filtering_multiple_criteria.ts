import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_search_filtering_multiple_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic pagination
  {
    const page = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number;
    const limit = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number as number;
    const response1 = await api.functional.ecommerce.categories.index(
      connection,
      {
        body: {
          page,
          limit,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
    typia.assert(response1);
    TestValidator.equals(
      "pagination current page",
      response1.pagination.current,
      page,
    );
    TestValidator.equals("pagination limit", response1.pagination.limit, limit);
    TestValidator.predicate(
      "pagination records non-negative",
      response1.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response1.pagination.pages >= 0,
    );
    // Validate hierarchical structure
    for (const category of response1.data) {
      typia.assert(category);
      if (category.parent !== null) {
        TestValidator.predicate(
          "parent is valid summary",
          category.parent.id !== undefined,
        );
      }
    }
  }
  // Test 2: Category IDs filtering
  {
    // Get some categories first to have IDs to filter with
    const initialResponse = await api.functional.ecommerce.categories.index(
      connection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
    typia.assert(initialResponse);
    if (initialResponse.data.length >= 2) {
      const categoryIds = initialResponse.data
        .slice(0, 2)
        .map((cat) => cat.id) satisfies string[] as (string &
        tags.Format<"uuid">)[];
      const response2 = await api.functional.ecommerce.categories.index(
        connection,
        {
          body: {
            category_ids: categoryIds satisfies
              | (string & tags.Format<"uuid">)[]
              | undefined satisfies
              | (string & tags.Format<"uuid">)[]
              | undefined,
            page: 1 satisfies number as number,
            limit: 100 satisfies number as number,
          } satisfies IEcommerceCategory.IRequest,
        },
      );
      typia.assert(response2);
      TestValidator.equals(
        "filtered categories count",
        response2.data.length,
        2,
      );
      for (const cat of response2.data) {
        TestValidator.predicate(
          "category ID in filtered list",
          categoryIds.includes(cat.id),
        );
      }
    }
  }
  // Test 3: Date range filtering
  {
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString() satisfies string as string & tags.Format<"date-time">;
    const oneMonthLater = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString() satisfies string as string & tags.Format<"date-time">;
    const response3 = await api.functional.ecommerce.categories.index(
      connection,
      {
        body: {
          start_date: oneMonthAgo satisfies
            | (string & tags.Format<"date-time">)
            | undefined satisfies
            | (string & tags.Format<"date-time">)
            | undefined,
          end_date: oneMonthLater satisfies
            | (string & tags.Format<"date-time">)
            | undefined satisfies
            | (string & tags.Format<"date-time">)
            | undefined,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
    typia.assert(response3);
    // Validate response structure
    TestValidator.predicate(
      "date filtered response has data",
      Array.isArray(response3.data),
    );
  }
  // Test 4: Metric type filtering
  {
    const metricTypes = ["sales", "products"] as (
      | "sales"
      | "products"
      | "engagement"
      | "performance"
    )[];
    const response4 = await api.functional.ecommerce.categories.index(
      connection,
      {
        body: {
          metric_types: metricTypes satisfies
            | ("sales" | "products" | "engagement" | "performance")[]
            | undefined satisfies
            | ("sales" | "products" | "engagement" | "performance")[]
            | undefined,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
    typia.assert(response4);
    TestValidator.predicate(
      "metric filtered response valid",
      response4.pagination !== undefined,
    );
  }
  // Test 5: Combined filtering
  {
    const now = new Date();
    const twoWeeksAgo = new Date(
      now.getTime() - 14 * 24 * 60 * 60 * 1000,
    ).toISOString() satisfies string as string & tags.Format<"date-time">;
    const allMetricTypes = [
      "sales",
      "products",
      "engagement",
      "performance",
    ] as ("sales" | "products" | "engagement" | "performance")[];
    // Get some category IDs first
    const initialCategories = await api.functional.ecommerce.categories.index(
      connection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 3 satisfies number as number,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
    typia.assert(initialCategories);
    if (initialCategories.data.length > 0) {
      const someCategoryIds = initialCategories.data
        .slice(0, 1)
        .map((cat) => cat.id) satisfies string[] as (string &
        tags.Format<"uuid">)[];
      const combinedResponse = await api.functional.ecommerce.categories.index(
        connection,
        {
          body: {
            category_ids: someCategoryIds satisfies
              | (string & tags.Format<"uuid">)[]
              | undefined satisfies
              | (string & tags.Format<"uuid">)[]
              | undefined,
            start_date: twoWeeksAgo satisfies
              | (string & tags.Format<"date-time">)
              | undefined satisfies
              | (string & tags.Format<"date-time">)
              | undefined,
            metric_types: allMetricTypes satisfies
              | ("sales" | "products" | "engagement" | "performance")[]
              | undefined satisfies
              | ("sales" | "products" | "engagement" | "performance")[]
              | undefined,
            page: 2 satisfies number as number,
            limit: 5 satisfies number as number,
          } satisfies IEcommerceCategory.IRequest,
        },
      );
      typia.assert(combinedResponse);
      TestValidator.equals(
        "combined test page number",
        combinedResponse.pagination.current,
        2,
      );
      TestValidator.equals(
        "combined test limit",
        combinedResponse.pagination.limit,
        5,
      );
      // Verify hierarchical structure in combined results
      for (const category of combinedResponse.data) {
        if (category.parent !== null) {
          typia.assert(category.parent);
          TestValidator.predicate(
            "parent has id",
            category.parent.id !== undefined,
          );
        }
      }
    }
  }
}
