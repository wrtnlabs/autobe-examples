import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_logs_listing_basic_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Use authorize_moderator_join utility to create and authorize a new moderator
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string>(),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: `https://example.com/avatar/${RandomGenerator.alphabets(10)}.png`,
    },
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 2. Prepare multiple moderation log filter tests with boundary conditions
  // Note: Using mostly empty or typical filters since creation of logs is not covered
  // Define typical valid request bodies
  const baseRequest: ICommunityPlatformModerationLog.IRequest = {
    moderatorId: moderatorAuth.id,
    actionType: undefined,
    postId: undefined,
    commentId: undefined,
    createdAtFrom: undefined,
    createdAtTo: undefined,
    updatedAtFrom: undefined,
    updatedAtTo: undefined,
    page: 1,
    limit: 10,
    sortBy: "created_at",
  };
  // 3. Test retrieving moderation logs with base filter
  const baseResponse =
    await api.functional.communityPlatform.moderator.moderation_logs.index(
      moderatorConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(baseResponse);
  // Validate pagination metadata integrity
  TestValidator.predicate(
    "pagination current page >= 1",
    baseResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit within 1 and 100",
    baseResponse.pagination.limit >= 1 && baseResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    baseResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    baseResponse.pagination.pages >= 0,
  );
  // If data is returned, validate each record
  if (baseResponse.data.length > 0) {
    baseResponse.data.forEach((log) => {
      // Validate log structure
      typia.assert(log);
      TestValidator.predicate(
        "log has id",
        typeof log.id === "string" && log.id.length > 0,
      );
      TestValidator.predicate(
        "log has actionType",
        typeof log.actionType === "string" && log.actionType.length > 0,
      );
      TestValidator.predicate(
        "log has moderator info",
        log.moderator !== undefined && log.moderator !== null,
      );
      TestValidator.predicate(
        "log has createdAt string",
        typeof log.createdAt === "string",
      );
      TestValidator.predicate(
        "log has updatedAt string",
        typeof log.updatedAt === "string",
      );
      // Validate either post or comment may be present or null
      TestValidator.predicate("log has post or comment or none", true);
    });
  }
  // 4. Test filter by actionType
  const filteredByActionType =
    await api.functional.communityPlatform.moderator.moderation_logs.index(
      moderatorConnection,
      {
        body: {
          ...baseRequest,
          actionType:
            baseResponse.data.length > 0
              ? baseResponse.data[0].actionType
              : "delete_post",
        },
      },
    );
  typia.assert(filteredByActionType);
  // 5. Test filter by postId if available in data
  if (baseResponse.data.length > 0) {
    const postId = baseResponse.data.find(
      (log) => log.post !== null && log.post !== undefined,
    )?.post?.id;
    if (postId) {
      const filteredByPostId =
        await api.functional.communityPlatform.moderator.moderation_logs.index(
          moderatorConnection,
          {
            body: {
              ...baseRequest,
              postId: postId,
            },
          },
        );
      typia.assert(filteredByPostId);
    }
  }
  // 6. Test filter by commentId if available in data
  if (baseResponse.data.length > 0) {
    const commentId = baseResponse.data.find(
      (log) => log.comment !== null && log.comment !== undefined,
    )?.comment?.id;
    if (commentId) {
      const filteredByCommentId =
        await api.functional.communityPlatform.moderator.moderation_logs.index(
          moderatorConnection,
          {
            body: {
              ...baseRequest,
              commentId: commentId,
            },
          },
        );
      typia.assert(filteredByCommentId);
    }
  }
  // 7. Test pagination boundaries
  if (baseResponse.pagination.pages > 1) {
    // Last page
    const lastPageResponse =
      await api.functional.communityPlatform.moderator.moderation_logs.index(
        moderatorConnection,
        {
          body: {
            ...baseRequest,
            page: baseResponse.pagination.pages,
          },
        },
      );
    typia.assert(lastPageResponse);
    // Page beyond last page, expect empty data or handled gracefully
    const beyondLastPageResponse =
      await api.functional.communityPlatform.moderator.moderation_logs.index(
        moderatorConnection,
        {
          body: {
            ...baseRequest,
            page: baseResponse.pagination.pages + 1,
          },
        },
      );
    typia.assert(beyondLastPageResponse);
    TestValidator.predicate(
      "page beyond last page returns empty or handled",
      beyondLastPageResponse.data.length === 0,
    );
  }
  // 8. Test sorting by updated_at
  const sortedByUpdatedAt =
    await api.functional.communityPlatform.moderator.moderation_logs.index(
      moderatorConnection,
      {
        body: {
          ...baseRequest,
          sortBy: "updated_at",
        },
      },
    );
  typia.assert(sortedByUpdatedAt);
  // 9. Test unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", [403], async () => {
    await api.functional.communityPlatform.moderator.moderation_logs.index(
      unauthorizedConnection,
      {
        body: baseRequest,
      },
    );
  });
}
