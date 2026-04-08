import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModeratorSession";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test the primary success path for listing moderator authentication sessions.
 *
 * Validates the complete moderator session listing workflow including moderator authentication and session retrieval with pagination. Ensures that the response contains properly structured session data with all required fields and pagination metadata.
 *
 * Special attention is given to verifying that the moderator can only see their own sessions and that pagination metadata is correctly calculated.
 *
 * 1. Moderator authenticates via join endpoint to obtain session tokens.
 * 2. Moderator calls session listing endpoint with pagination parameters.
 * 3. Validates response contains pagination metadata with correct structure.
 * 4. Validates that sessions belong to the authenticated moderator.
 * 5. Validates pagination consistency (pages = ceil(records/limit)).
 */
export async function test_api_moderator_session_list_own_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_moderator_join(moderatorConnection, {
    body: undefined,
  });
  // 2. List sessions with pagination
  const sessions =
    await api.functional.redditClone.moderator.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCloneModeratorSession.IRequest,
      },
    );
  typia.assert(sessions);
  // 3. Validate pagination metadata consistency
  TestValidator.equals(
    "pagination current page matches request",
    sessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    sessions.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    sessions.pagination.pages >= 0,
  );
  // 4. Validate pages calculation: pages = ceil(records / limit)
  const expectedPages =
    sessions.pagination.records === 0
      ? 0
      : Math.ceil(sessions.pagination.records / sessions.pagination.limit);
  TestValidator.equals(
    "pagination pages calculation is correct",
    sessions.pagination.pages,
    expectedPages,
  );
  // 5. Validate that at least one session exists (the current one from join)
  TestValidator.predicate(
    "at least one session exists (current session from join)",
    sessions.data.length >= 1,
  );
  // 6. Validate all sessions belong to the authenticated moderator
  for (const session of sessions.data) {
    TestValidator.equals(
      `session belongs to authenticated moderator: ${session.moderator.id}`,
      session.moderator.id,
      authResult.id,
    );
  }
  // 7. Validate sessions are sorted by created_at descending
  if (sessions.data.length > 1) {
    for (let i = 1; i < sessions.data.length; i++) {
      const prevDate = new Date(sessions.data[i - 1].created_at).getTime();
      const currDate = new Date(sessions.data[i].created_at).getTime();
      TestValidator.predicate(
        `sessions sorted by created_at descending: index ${i - 1} >= index ${i}`,
        prevDate >= currDate,
      );
    }
  }
}
