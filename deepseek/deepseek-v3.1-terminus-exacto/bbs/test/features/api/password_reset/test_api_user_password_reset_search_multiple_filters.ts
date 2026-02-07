import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDateRange";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_search_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user context for searching
  const searchConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(searchConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Note: Since we don't have utility functions to create password reset requests,
  // and the search endpoint is the only available operation, we'll test the search
  // functionality with various filter combinations based on whatever data exists
  // in the system. The test validates that the search endpoint properly handles
  // different filter combinations and returns valid paginated results.
  const searchTests = [
    {
      name: "user_type filter - user",
      body: {
        user_type: "user" as const,
      } satisfies IDiscussionBoardUserPasswordReset.IRequest,
    },
    {
      name: "status filter - unused",
      body: {
        status: "unused" as const,
      } satisfies IDiscussionBoardUserPasswordReset.IRequest,
    },
    {
      name: "status filter - used",
      body: {
        status: "used" as const,
      } satisfies IDiscussionBoardUserPasswordReset.IRequest,
    },
    {
      name: "status filter - expired",
      body: {
        status: "expired" as const,
      } satisfies IDiscussionBoardUserPasswordReset.IRequest,
    },
    {
      name: "created_at_range filter",
      body: {
        created_at_range: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        } satisfies IDiscussionBoardDateRange,
      } satisfies IDiscussionBoardUserPasswordReset.IRequest,
    },
    {
      name: "expired_at_range filter",
      body: {
        expired_at_range: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        } satisfies IDiscussionBoardDateRange,
      } satisfies IDiscussionBoardUserPasswordReset.IRequest,
    },
    {
      name: "pagination test",
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardUserPasswordReset.IRequest,
    },
    {
      name: "combined filters - user with pagination",
      body: {
        user_type: "user" as const,
        status: "unused" as const,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardUserPasswordReset.IRequest,
    },
    {
      name: "no filters (all results)",
      body: {} satisfies IDiscussionBoardUserPasswordReset.IRequest,
    },
  ];
  for (const test of searchTests) {
    const result =
      await api.functional.discussionBoard.user.password_resets.index(
        searchConnection,
        {
          body: test.body,
        },
      );
    typia.assert(result);
    // Validate pagination metadata structure
    TestValidator.predicate(
      `${test.name} - pagination object exists`,
      result.pagination !== undefined && result.pagination !== null,
    );
    TestValidator.predicate(
      `${test.name} - pagination current page valid`,
      result.pagination.current >= 0,
    );
    TestValidator.predicate(
      `${test.name} - pagination limit valid`,
      result.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${test.name} - pagination records valid`,
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${test.name} - pagination pages valid`,
      result.pagination.pages >= 0,
    );
    // Validate data array structure
    TestValidator.predicate(
      `${test.name} - data is array`,
      Array.isArray(result.data),
    );
    // Validate each result item if data exists
    for (const item of result.data) {
      typia.assert(item);
      // Security validation: user summary should contain display name and bio
      // but NOT contain email or password hash
      TestValidator.predicate(
        `${test.name} - user summary has display_name`,
        typeof item.user.display_name === "string" &&
          item.user.display_name.length > 0,
      );
      TestValidator.predicate(
        `${test.name} - user summary bio is string or null`,
        item.user.bio === null || typeof item.user.bio === "string",
      );
      // Validate timestamps format
      TestValidator.predicate(
        `${test.name} - expired_at is valid ISO string`,
        !isNaN(new Date(item.expired_at).getTime()),
      );
      TestValidator.predicate(
        `${test.name} - created_at is valid ISO string`,
        !isNaN(new Date(item.created_at).getTime()),
      );
      // used_at can be null for unused/expired requests
      if (item.used_at !== null) {
        TestValidator.predicate(
          `${test.name} - used_at is valid ISO string when present`,
          !isNaN(new Date(item.used_at).getTime()),
        );
      }
      // Validate UUID format for ID
      TestValidator.predicate(
        `${test.name} - id is valid UUID`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          item.id,
        ),
      );
    }
    // Validate pagination calculations
    if (result.pagination.limit > 0) {
      TestValidator.equals(
        `${test.name} - pagination pages calculation`,
        result.pagination.pages,
        Math.ceil(result.pagination.records / result.pagination.limit),
      );
    }
    // Validate data length doesn't exceed limit
    TestValidator.predicate(
      `${test.name} - data length <= limit`,
      result.data.length <= result.pagination.limit,
    );
  }
}
