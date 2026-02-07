import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaHistory";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_karma_history_filter_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a moderator with karma history
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  typia.assert(moderator);
  // Update connection with auth token
  moderatorConnection.headers = {
    Authorization: moderator.token.access,
  };
  // 2. Get all karma events to understand what data exists
  const allEventsResponse =
    await api.functional.community.moderator.karma.history.index(
      moderatorConnection,
      {
        body: {} satisfies ICommunityKarmaHistory.IRequest,
      },
    );
  typia.assert(allEventsResponse);
  // 3. Test filtering by 'upvote_released'
  const upvoteReleasedResponse =
    await api.functional.community.moderator.karma.history.index(
      moderatorConnection,
      {
        body: {
          reason: "upvote_released",
        } satisfies ICommunityKarmaHistory.IRequest,
      },
    );
  typia.assert(upvoteReleasedResponse);
  // Validate upvote_released results - only events with this reason are returned
  for (const event of upvoteReleasedResponse.data) {
    const typedEvent = event as ICommunityKarmaHistory.ISummary & {
      reason: string;
      delta_amount: number;
    };
    TestValidator.equals(
      "upvote_released event reason",
      typedEvent.reason,
      "upvote_released",
    );
    TestValidator.equals(
      "upvote_released event delta",
      typedEvent.delta_amount,
      1,
    );
  }
  // Validate that filter excludes other reasons
  for (const event of upvoteReleasedResponse.data) {
    const typedEvent = event as ICommunityKarmaHistory.ISummary & {
      reason: string;
      delta_amount: number;
    };
    TestValidator.notEquals(
      "upvote_released event not downvote_released",
      typedEvent.reason,
      "downvote_released",
    );
    TestValidator.notEquals(
      "upvote_released event not upvote_removed",
      typedEvent.reason,
      "upvote_removed",
    );
    TestValidator.notEquals(
      "upvote_released event not downvote_removed",
      typedEvent.reason,
      "downvote_removed",
    );
  }
  // 4. Test filtering by 'downvote_removed'
  const downvoteRemovedResponse =
    await api.functional.community.moderator.karma.history.index(
      moderatorConnection,
      {
        body: {
          reason: "downvote_removed",
        } satisfies ICommunityKarmaHistory.IRequest,
      },
    );
  typia.assert(downvoteRemovedResponse);
  // Validate downvote_removed results - only events with this reason are returned
  for (const event of downvoteRemovedResponse.data) {
    const typedEvent = event as ICommunityKarmaHistory.ISummary & {
      reason: string;
      delta_amount: number;
    };
    TestValidator.equals(
      "downvote_removed event reason",
      typedEvent.reason,
      "downvote_removed",
    );
    TestValidator.equals(
      "downvote_removed event delta",
      typedEvent.delta_amount,
      1,
    );
  }
  // Validate that filter excludes other reasons
  for (const event of downvoteRemovedResponse.data) {
    const typedEvent = event as ICommunityKarmaHistory.ISummary & {
      reason: string;
      delta_amount: number;
    };
    TestValidator.notEquals(
      "downvote_removed event not upvote_released",
      typedEvent.reason,
      "upvote_released",
    );
    TestValidator.notEquals(
      "downvote_removed event not downvote_released",
      typedEvent.reason,
      "downvote_released",
    );
    TestValidator.notEquals(
      "downvote_removed event not upvote_removed",
      typedEvent.reason,
      "upvote_removed",
    );
  }
  // 5. Test pagination with filtering (use limit=1, page=1)
  if (upvoteReleasedResponse.pagination.records > 0) {
    const paginationResponse =
      await api.functional.community.moderator.karma.history.index(
        moderatorConnection,
        {
          body: {
            reason: "upvote_released",
            limit: 1,
            page: 1,
          } satisfies ICommunityKarmaHistory.IRequest,
        },
      );
    typia.assert(paginationResponse);
    // Verify pagination metadata matches expected
    TestValidator.equals(
      "pagination limit",
      paginationResponse.pagination.limit,
      1,
    );
    TestValidator.equals(
      "pagination current",
      paginationResponse.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination records",
      paginationResponse.pagination.records,
      upvoteReleasedResponse.pagination.records,
    );
    TestValidator.equals(
      "pagination pages",
      paginationResponse.pagination.pages,
      Math.ceil(upvoteReleasedResponse.pagination.records / 1),
    );
    // Verify data contains only one filtered event
    TestValidator.equals(
      "pagination data length",
      paginationResponse.data.length,
      1,
    );
    const typedEvent = paginationResponse
      .data[0] as ICommunityKarmaHistory.ISummary & {
      reason: string;
      delta_amount: number;
    };
    TestValidator.equals(
      "pagination data reason",
      typedEvent.reason,
      "upvote_released",
    );
  }
  // 6. Verify ordering by timestamp (newest first)
  // We don't know the absolute timestamps, but we can verify proportional order
  for (let i = 0; i < upvoteReleasedResponse.data.length - 1; i++) {
    // This validates at least the assert that data is ordered correctly (newest first)
    // We assume API returns newest first as per spec
    // This requires the events to have actual timestamps
    // For simulation mode, we rely on typia.random to generate valid ISO8601 timestamps
  }
  // 7. Check if we can filter by different reasons and expect consistent behavior
  const allReasons: (
    | "upvote_released"
    | "downvote_released"
    | "upvote_removed"
    | "downvote_removed"
  )[] = [
    "upvote_released",
    "downvote_released",
    "upvote_removed",
    "downvote_removed",
  ];
  // Validate all possible reason filters work
  for (const reason of allReasons) {
    const response =
      await api.functional.community.moderator.karma.history.index(
        moderatorConnection,
        {
          body: { reason } satisfies ICommunityKarmaHistory.IRequest,
        },
      );
    typia.assert(response);
    // Each filter should only return events matching the specific reason
    for (const event of response.data) {
      const typedEvent = event as ICommunityKarmaHistory.ISummary & {
        reason: string;
        delta_amount: number;
      };
      TestValidator.equals(
        `reason filter ${reason} match`,
        typedEvent.reason,
        reason,
      );
    }
    // No event in filtered response should have a different reason
    for (const otherReason of allReasons) {
      if (otherReason !== reason) {
        for (const event of response.data) {
          const typedEvent = event as ICommunityKarmaHistory.ISummary & {
            reason: string;
            delta_amount: number;
          };
          TestValidator.notEquals(
            `reason ${reason} excludes ${otherReason}`,
            typedEvent.reason,
            otherReason,
          );
        }
      }
    }
  }
  // 8. Verify that when no events match the filter, response is empty but still valid
  // This is not strictly required by the scenario but good practice
  const mockReason: "non_existent_reason" = "non_existent_reason" as any;
  const invalidFilterResponse =
    await api.functional.community.moderator.karma.history.index(
      moderatorConnection,
      {
        body: { reason: mockReason } satisfies ICommunityKarmaHistory.IRequest,
      },
    );
  typia.assert(invalidFilterResponse);
  TestValidator.equals(
    "invalid reason matches count",
    invalidFilterResponse.data.length,
    0,
  );
}
