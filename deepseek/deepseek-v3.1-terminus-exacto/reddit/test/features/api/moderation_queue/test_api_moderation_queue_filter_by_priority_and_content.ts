import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_queue_filter_by_priority_and_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Test basic filtering with priority='high'
  const highPriorityResult =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderatorConnection,
      {
        body: {
          priority: "high" satisfies string | null | undefined,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(highPriorityResult);
  // 3. Test priority='critical' with status='assigned'
  const criticalAssignedResult =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderatorConnection,
      {
        body: {
          priority: "critical" satisfies string | null | undefined,
          status: "assigned" satisfies string | null | undefined,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 25 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(criticalAssignedResult);
  // 4. Test filtering by post_id with non-existent ID (should return empty)
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const postFilterResult =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderatorConnection,
      {
        body: {
          post_id: nonExistentPostId satisfies
            | (string & tags.Format<"uuid">)
            | null
            | undefined,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(postFilterResult);
  TestValidator.equals(
    "empty result for non-existent post ID",
    postFilterResult.data.length,
    0,
  );
  // 5. Test filtering by comment_id
  const commentFilterResult =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderatorConnection,
      {
        body: {
          comment_id: null satisfies
            | (string & tags.Format<"uuid">)
            | null
            | undefined,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(commentFilterResult);
  // 6. Test combined filters: priority='high', status='assigned', and moderator_id
  const combinedFilterResult =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderatorConnection,
      {
        body: {
          priority: "high" satisfies string | null | undefined,
          status: "assigned" satisfies string | null | undefined,
          moderator_id: moderator.id satisfies
            | (string & tags.Format<"uuid">)
            | null
            | undefined,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // 7. Validate pagination metadata
  TestValidator.predicate("pagination fields present", () => {
    return (
      typeof combinedFilterResult.pagination.current === "number" &&
      typeof combinedFilterResult.pagination.limit === "number" &&
      typeof combinedFilterResult.pagination.records === "number" &&
      typeof combinedFilterResult.pagination.pages === "number"
    );
  });
  // 8. Test different limit values
  const limitValues = [10, 25, 50] as const;
  for (const limit of limitValues) {
    const limitTestResult =
      await api.functional.communityPlatform.moderator.moderation_queues.index(
        moderatorConnection,
        {
          body: {
            page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(limitTestResult);
    TestValidator.predicate(`limit ${limit} respected`, () => {
      return limitTestResult.data.length <= limit;
    });
  }
}
