import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

export async function test_api_appeals_sorting_and_ordering(
  connection: api.IConnection,
) {
  // 1. Create registered user account for authentication context
  const userData = {
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Test 2: Appeals search with different sorting options and order directions

  // Test sorting by creation date (ascending)
  const appealsByCreatedAsc =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          order_by: "created_at",
          order_direction: "asc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(appealsByCreatedAsc);
  TestValidator.equals(
    "appeals search by created_at ascending returns valid response",
    appealsByCreatedAsc.pagination.current,
    1,
  );

  // Test sorting by creation date (descending)
  const appealsByCreatedDesc =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          order_by: "created_at",
          order_direction: "desc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(appealsByCreatedDesc);
  TestValidator.equals(
    "appeals search by created_at descending returns valid response",
    appealsByCreatedDesc.pagination.current,
    1,
  );

  // Test sorting by updated date (ascending)
  const appealsByUpdatedAsc =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          order_by: "updated_at",
          order_direction: "asc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(appealsByUpdatedAsc);
  TestValidator.equals(
    "appeals search by updated_at ascending returns valid response",
    appealsByUpdatedAsc.pagination.current,
    1,
  );

  // Test sorting by updated date (descending)
  const appealsByUpdatedDesc =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          order_by: "updated_at",
          order_direction: "desc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(appealsByUpdatedDesc);
  TestValidator.equals(
    "appeals search by updated_at descending returns valid response",
    appealsByUpdatedDesc.pagination.current,
    1,
  );

  // Test sorting by resolved date (ascending)
  const appealsByResolvedAsc =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          order_by: "resolved_at",
          order_direction: "asc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(appealsByResolvedAsc);
  TestValidator.equals(
    "appeals search by resolved_at ascending returns valid response",
    appealsByResolvedAsc.pagination.current,
    1,
  );

  // Test sorting by resolved date (descending)
  const appealsByResolvedDesc =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          order_by: "resolved_at",
          order_direction: "desc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(appealsByResolvedDesc);
  TestValidator.equals(
    "appeals search by resolved_at descending returns valid response",
    appealsByResolvedDesc.pagination.current,
    1,
  );

  // Test sorting by appeal level (ascending)
  const appealsByLevelAsc =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          order_by: "appeal_level",
          order_direction: "asc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(appealsByLevelAsc);
  TestValidator.equals(
    "appeals search by appeal_level ascending returns valid response",
    appealsByLevelAsc.pagination.current,
    1,
  );

  // Test sorting by appeal level (descending)
  const appealsByLevelDesc =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          order_by: "appeal_level",
          order_direction: "desc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(appealsByLevelDesc);
  TestValidator.equals(
    "appeals search by appeal_level descending returns valid response",
    appealsByLevelDesc.pagination.current,
    1,
  );

  // Test default sorting (no order_by specified, should default to created_at desc)
  const appealsDefault =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(appealsDefault);
  TestValidator.equals(
    "appeals search with default sorting returns valid response",
    appealsDefault.pagination.current,
    1,
  );

  // Validate response structure and data types
  TestValidator.equals(
    "response contains valid pagination metadata",
    appealsByCreatedAsc.pagination.limit,
    20,
  );

  // Validate appeal data structure if any appeals exist
  if (appealsByCreatedAsc.data.length > 0) {
    const firstAppeal = appealsByCreatedAsc.data[0];
    TestValidator.predicate(
      "appeal record contains required fields",
      firstAppeal.id !== undefined &&
        firstAppeal.created_at !== undefined &&
        firstAppeal.updated_at !== undefined &&
        firstAppeal.status !== undefined &&
        firstAppeal.appeal_level !== undefined,
    );

    // Validate moderation action data
    TestValidator.predicate(
      "appeal includes moderation action summary",
      firstAppeal.moderation_action !== undefined &&
        firstAppeal.moderation_action.id !== undefined,
    );

    // Validate appellant session data
    TestValidator.predicate(
      "appeal includes appellant session summary",
      firstAppeal.appellant_session !== undefined &&
        firstAppeal.appellant_session.id !== undefined,
    );
  }

  // Test pagination parameters
  const appealsWithPagination =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          limit: 10,
          page: 2,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(appealsWithPagination);
  TestValidator.equals(
    "pagination test with custom limit and page returns correct metadata",
    appealsWithPagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is respected",
    appealsWithPagination.pagination.limit,
    10,
  );
}
