import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_moderation_queue_retrieval_by_community_moderator_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and get authenticated context
  const platformAdminJoinInput =
    typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert(platformAdmin);

  // 2. Create a moderation queue as platformAdmin
  const createQueueBody =
    typia.random<ICommunityPlatformModerationQueue.ICreate>();

  const createdQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: createQueueBody,
      },
    );
  typia.assert(createdQueue);

  // 3. Build an unauthenticated connection (no headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Try to retrieve the moderation queue via communityModerator endpoint
  await TestValidator.httpError(
    "unauthenticated moderator queue retrieval must fail",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.communityModerator.moderationQueues.at(
        unauthenticatedConnection,
        {
          moderationQueueId: createdQueue.id,
        },
      );
    },
  );

  // 5. Optionally simulate invalid/expired token by using a bogus Authorization
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: "Bearer invalid-token",
    },
  };

  await TestValidator.httpError(
    "invalid token moderator queue retrieval must fail",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.communityModerator.moderationQueues.at(
        invalidTokenConnection,
        {
          moderationQueueId: createdQueue.id,
        },
      );
    },
  );
}
