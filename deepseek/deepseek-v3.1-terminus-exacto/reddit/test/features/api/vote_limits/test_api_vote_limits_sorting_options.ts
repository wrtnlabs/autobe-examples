import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformVoteLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteLimit";

/**
 * Test vote limits sorting functionality with various sort_by options.
 *
 * Validates that administrators can sort results by max_votes, current_count,
 * period_start, and period_end fields in both ascending and descending orders.
 * Verifies that sorting produces correctly ordered results for each field
 * type.
 */
export async function test_api_vote_limits_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test all sorting combinations
  const sortFields = [
    "max_votes",
    "current_count",
    "period_start",
    "period_end",
  ] as const;
  const orders = ["asc", "desc"] as const;

  for (const sortField of sortFields) {
    for (const order of orders) {
      await testSortingOption(connection, sortField, order);
    }
  }

  async function testSortingOption(
    connection: api.IConnection,
    sortBy: "max_votes" | "current_count" | "period_start" | "period_end",
    order: "asc" | "desc",
  ) {
    const result =
      await api.functional.communityPlatform.admin.voteLimits.index(
        connection,
        {
          body: {
            page: 1,
            limit: 50,
            sort_by: sortBy,
            order: order,
          } satisfies ICommunityPlatformVoteLimit.IRequest,
        },
      );
    typia.assert(result);

    // Validate pagination structure
    TestValidator.equals(
      "pagination structure exists",
      result.pagination !== undefined,
      true,
    );
    TestValidator.equals("data array exists", Array.isArray(result.data), true);

    // Skip sorting validation if insufficient data
    if (result.data.length <= 1) {
      console.log(
        `Insufficient data for ${sortBy} ${order} sorting validation (${result.data.length} records)`,
      );
      return;
    }

    // Validate sorting order
    for (let i = 1; i < result.data.length; i++) {
      const current = result.data[i];
      const previous = result.data[i - 1];

      let isValid = false;

      switch (sortBy) {
        case "max_votes":
          isValid =
            order === "asc"
              ? previous.max_votes <= current.max_votes
              : previous.max_votes >= current.max_votes;
          break;

        case "current_count":
          isValid =
            order === "asc"
              ? previous.current_count <= current.current_count
              : previous.current_count >= current.current_count;
          break;

        case "period_start":
          isValid =
            order === "asc"
              ? previous.period_start <= current.period_start
              : previous.period_start >= current.period_start;
          break;

        case "period_end":
          isValid =
            order === "asc"
              ? previous.period_end <= current.period_end
              : previous.period_end >= current.period_end;
          break;
      }

      TestValidator.predicate(
        `${sortBy} ${order} order: position ${i - 1} vs ${i}`,
        isValid,
      );
    }
  }
}
