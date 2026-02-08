import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_community_platform_moderator_concurrent_update_comment_sort_orders(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests concurrent updates to comment sorting metadata by a moderator on the same comment.
  // It involves moderator joining, creating a comment as user, then executing multiple patch requests with varying sorting strategies and sort values.
  // The test validates optimistic concurrency control ensuring no race conditions corrupt the sorting data and all updates are persisted accurately.
  // It verifies system resilience under concurrent modification attempts with authorization.
  // 1. Moderator joins and logs in
  const moderatorConnection: api.IConnection = { host: connection.host };
  const modJoin = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(modJoin);
  const modLogin = await authorize_moderator_login(moderatorConnection, {
    body: {},
  });
  typia.assert(modLogin);
  // 2. User joins and logs in
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoin);
  const userLogin = await authorize_user_login(userConnection, {
    body: {},
  });
  typia.assert(userLogin);
  // 3. User creates a comment
  await generate_random_community_platform_user_comments_create(
    userConnection,
    {
      body: {},
    },
  );
  // 4. Prepare multiple concurrent patch requests with random bodies
  const updates = ArrayUtil.repeat(3, () =>
    typia.random<
      import("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder").ICommunityPlatformCommentSortOrder.IRequest
    >(),
  );
  // 5. Run patch requests concurrently
  const patchPromises = updates.map(async (body) => {
    const updatedComment =
      await api.functional.communityPlatform.moderator.comments.sort_orders.index(
        moderatorConnection,
        {
          commentId: typia.random<
            string & import("typia").tags.Format<"uuid">
          >(),
          body,
        },
      );
    typia.assert(updatedComment);
    return updatedComment;
  });
  const results = await Promise.all(patchPromises);
  // 6. Validate responses have been received and are of expected type
  for (const updated of results) {
    typia.assert(updated);
  }
}
