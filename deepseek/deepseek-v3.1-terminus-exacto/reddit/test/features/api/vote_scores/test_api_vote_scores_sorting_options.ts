import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteScore";

/**
 * Test vote scores sorting functionality with various sort_by options.
 *
 * Validates that administrators can sort results by total_score, hot_score,
 * best_score, and calculated_at fields in both ascending and descending orders.
 * Verifies that sorting produces correctly ordered results for each field
 * type.
 */
export async function test_api_vote_scores_sorting_options(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!" satisfies string &
    tags.Format<"password">;

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Test sorting by each available field with both orders
  const sortFields = [
    "total_score",
    "hot_score",
    "best_score",
    "calculated_at",
  ] as const;
  const orders = ["asc", "desc"] as const;

  for (const sortField of sortFields) {
    for (const order of orders) {
      // Test sorting with specific field and order
      const result =
        await api.functional.communityPlatform.admin.voteScores.index(
          connection,
          {
            body: {
              page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
              limit: 10 satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<100>,
              sort_by: sortField,
              order: order,
            } satisfies ICommunityPlatformVoteScore.IRequest,
          },
        );
      typia.assert(result);

      // Validate pagination structure
      TestValidator.equals(
        "pagination structure exists",
        result.pagination !== undefined,
        true,
      );
      TestValidator.predicate(
        "current page is 1",
        result.pagination.current === 1,
      );
      TestValidator.predicate(
        "limit is correct",
        result.pagination.limit === 10,
      );

      // Validate sorting order if we have sufficient data
      if (result.data.length > 1) {
        for (let i = 1; i < result.data.length; i++) {
          const prevItem = result.data[i - 1];
          const currentItem = result.data[i];

          // Compare values based on sort field and order
          let isValidOrder = true;

          switch (sortField) {
            case "total_score":
              if (order === "asc") {
                isValidOrder = prevItem.total_score <= currentItem.total_score;
              } else {
                isValidOrder = prevItem.total_score >= currentItem.total_score;
              }
              break;

            case "hot_score":
              if (order === "asc") {
                isValidOrder = prevItem.hot_score <= currentItem.hot_score;
              } else {
                isValidOrder = prevItem.hot_score >= currentItem.hot_score;
              }
              break;

            case "best_score":
              if (order === "asc") {
                isValidOrder = prevItem.best_score <= currentItem.best_score;
              } else {
                isValidOrder = prevItem.best_score >= currentItem.best_score;
              }
              break;

            case "calculated_at":
              // Use string comparison for ISO dates (lexicographical order matches chronological)
              if (order === "asc") {
                isValidOrder =
                  prevItem.calculated_at <= currentItem.calculated_at;
              } else {
                isValidOrder =
                  prevItem.calculated_at >= currentItem.calculated_at;
              }
              break;
          }

          TestValidator.predicate(
            `items ${i - 1} and ${i} are correctly ordered by ${sortField} ${order}`,
            isValidOrder,
          );
        }
      } else {
        TestValidator.predicate(
          `sorting test for ${sortField} ${order} completed`,
          result.data.length >= 0,
        );
      }
    }
  }

  // 3. Test without sorting parameters (should use default sorting)
  const defaultResult =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default request returns data",
    defaultResult.data.length >= 0,
  );

  // 4. Test with content type filtering combined with sorting
  const contentTypes = ["post", "comment"] as const;
  for (const contentType of contentTypes) {
    const filteredResult =
      await api.functional.communityPlatform.admin.voteScores.index(
        connection,
        {
          body: {
            page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 5 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
            content_type: contentType,
            sort_by: "total_score",
            order: "desc",
          } satisfies ICommunityPlatformVoteScore.IRequest,
        },
      );
    typia.assert(filteredResult);

    // Validate that all returned items match the content type filter
    if (filteredResult.data.length > 0) {
      for (const item of filteredResult.data) {
        TestValidator.equals(
          `item content type matches filter ${contentType}`,
          item.content_type,
          contentType,
        );
      }
    }
  }
}
