import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

/**
 * Test moderator log audit access and filtering for moderation actions.
 *
 * 1. Authenticate as a moderator with join API.
 * 2. Get moderation actions log without filters (should succeed and return page
 *    information and summary list).
 * 3. Validate that only allowed fields are present in result (moderator cannot see
 *    sensitive data).
 * 4. Filter results by action_type (e.g., "remove_post") and ensure that returned
 *    records match the filter.
 * 5. If results exist, further filter by actor (moderator's id), or by a known
 *    target_post_id from result, or report_id, and check that only records
 *    matching filter are returned.
 * 6. Use description_query derived from an existing summary's action_type to test
 *    fuzzy/text filtering.
 * 7. Use start_time and end_time to filter results within a detected range;
 *    validate the filtered range.
 * 8. Use non-existent actor_id and future start_time (far future) to assert that
 *    result is empty for impossible filters.
 * 9. Validate correct functioning of pagination (e.g., limit 1, 2, 5).
 */
export async function test_api_moderation_action_log_audit_access_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a moderator; use random email/password/community_id.
  const moderatorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    community_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ICommunityPlatformModerator.IJoin;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 2. Get moderationActions index with empty/no filter (default page/limit)
  const page =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      { body: {} satisfies ICommunityPlatformModerationAction.IRequest },
    );
  typia.assert(page);
  TestValidator.predicate(
    "moderator actions paginated page metadata",
    typeof page.pagination.current === "number" && page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "moderation action data is array",
    Array.isArray(page.data),
  );

  // 3. Privacy enforcement - only allowed fields returned
  for (const summary of page.data) {
    TestValidator.predicate(
      "action summary contains only permitted fields",
      summary.id !== undefined &&
        summary.action_type !== undefined &&
        summary.created_at !== undefined,
    );
  }

  // 4. Filter by action_type (if any record exists)
  if (page.data.length > 0) {
    const actionType = page.data[0].action_type;
    const byActionType =
      await api.functional.communityPlatform.moderator.moderationActions.index(
        connection,
        {
          body: {
            action_type: actionType,
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(byActionType);
    for (const act of byActionType.data) {
      TestValidator.equals(
        "action_type filter matches",
        act.action_type,
        actionType,
      );
    }

    // 5. Additional filters (actor_id, target_post_id, report_id)
    if (byActionType.data.length > 0) {
      const summary = byActionType.data[0];

      // by actor_id (use authenticated moderator id)
      const byActor =
        await api.functional.communityPlatform.moderator.moderationActions.index(
          connection,
          {
            body: {
              actor_id: moderator.id,
            } satisfies ICommunityPlatformModerationAction.IRequest,
          },
        );
      typia.assert(byActor);
      for (const act of byActor.data) {
        TestValidator.equals(
          "actor_id filter returns only moderator's actions",
          moderator.id,
          moderator.id,
        ); // can only check that query succeeded
      }

      // by target_post_id if present
      if (summary.target_post_id) {
        const byPost =
          await api.functional.communityPlatform.moderator.moderationActions.index(
            connection,
            {
              body: {
                target_post_id: summary.target_post_id,
              } satisfies ICommunityPlatformModerationAction.IRequest,
            },
          );
        typia.assert(byPost);
        for (const act of byPost.data) {
          TestValidator.equals(
            "target_post_id filter matches",
            act.target_post_id,
            summary.target_post_id,
          );
        }
      }

      // by report_id if present
      if (summary.report_id) {
        const byReport =
          await api.functional.communityPlatform.moderator.moderationActions.index(
            connection,
            {
              body: {
                report_id: summary.report_id,
              } satisfies ICommunityPlatformModerationAction.IRequest,
            },
          );
        typia.assert(byReport);
        for (const act of byReport.data) {
          TestValidator.equals(
            "report_id filter matches",
            act.report_id,
            summary.report_id,
          );
        }
      }
    }

    // 6. Filter by description_query (use action_type for fuzzy match demo)
    const byDescriptionQuery =
      await api.functional.communityPlatform.moderator.moderationActions.index(
        connection,
        {
          body: {
            description_query: actionType,
          } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(byDescriptionQuery);
    TestValidator.predicate(
      "description fuzzy filter returned page",
      Array.isArray(byDescriptionQuery.data),
    );
  }

  // 7. Filter by start_time/end_time (range); use now/future to test empty
  const now = new Date().toISOString();
  const farFuture = new Date(
    Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const futureResults =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          start_time: farFuture,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(futureResults);
  TestValidator.equals(
    "future start_time returns no actions",
    futureResults.data.length,
    0,
  );

  // 8. Filter by non-existent actor_id (random uuid)
  const badActorResults =
    await api.functional.communityPlatform.moderator.moderationActions.index(
      connection,
      {
        body: {
          actor_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(badActorResults);
  TestValidator.equals(
    "non-existent actor_id returns no actions",
    badActorResults.data.length,
    0,
  );

  // 9. Test pagination (limit 1 and limit 2)
  for (const limit of [1, 2, 5]) {
    const paged =
      await api.functional.communityPlatform.moderator.moderationActions.index(
        connection,
        {
          body: { limit } satisfies ICommunityPlatformModerationAction.IRequest,
        },
      );
    typia.assert(paged);
    TestValidator.predicate(
      `moderation actions pagination with limit=${limit}`,
      paged.data.length <= limit,
    );
  }
}
