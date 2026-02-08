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

export async function test_api_community_platform_moderator_update_comment_sort_orders_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User creates a comment
  const userConnection: api.IConnection = { host: connection.host };
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    { body: {} },
  );
  typia.assert(comment);
  // Assert that comment has 'id' property as string & Format<'uuid'>
  const commentId = (
    comment as unknown as {
      id: string & tags.Format<"uuid">;
    }
  ).id;
  // 2. Moderator join and login
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorJoined = await authorize_moderator_join(
    moderatorJoinConnection,
    { body: {} },
  );
  typia.assert(moderatorJoined);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorLoggedIn = await authorize_moderator_login(
    moderatorConnection,
    { body: {} },
  );
  typia.assert(moderatorLoggedIn);
  moderatorConnection.headers = {
    Authorization: moderatorLoggedIn.token.access,
  };
  // 3. Prepare sort orders for patching
  const sortOrders: ICommunityPlatformCommentSortOrder.IRequest = [
    {
      strategy: "best",
      sort_value: typia.random<number & tags.Type<"int32">>(),
    },
    {
      strategy: "new",
      sort_value: typia.random<number & tags.Type<"int32">>(),
    },
    {
      strategy: "controversial",
      sort_value: typia.random<number & tags.Type<"int32">>(),
    },
  ];
  // 4. Moderator updates comment sort orders
  const updatedComment =
    await api.functional.communityPlatform.moderator.comments.sort_orders.index(
      moderatorConnection,
      {
        commentId: commentId,
        body: sortOrders,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate that updated comment id matches original comment id
  // Assert updatedComment also has id property
  const updatedCommentId = (
    updatedComment as unknown as {
      id: string & tags.Format<"uuid">;
    }
  ).id;
  TestValidator.equals(
    "updated comment id matches",
    updatedCommentId,
    commentId,
  );
}
