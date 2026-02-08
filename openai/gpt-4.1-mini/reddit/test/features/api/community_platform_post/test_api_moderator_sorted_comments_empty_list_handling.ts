import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostComment";
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

export async function test_api_moderator_sorted_comments_empty_list_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResponse = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorJoinResponse);
  const moderatorLoginResponse = await authorize_moderator_login(
    moderatorConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorLoginResponse);
  // 2. User join and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResponse = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoinResponse);
  const userLoginResponse = await authorize_user_login(userConnection, {
    body: {},
  });
  typia.assert(userLoginResponse);
  // 3. Create a post by user to have a postId to pass
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        community_id: communityId,
        title: "Test post for empty comments",
        post_type: "text",
        text: {
          content: "This is a test post content.",
        },
      },
    },
  );
  typia.assert(post);
  // 4. Use the actual post.id as the postId
  const postId = (
    post as unknown as {
      id: string & tags.Format<"uuid">;
    }
  ).id;
  // 5. Prepare sorted comments request body with pagination and sorting defaults
  const sortedCommentsRequestBody = {
    parent_id: null,
    search: null,
    page: 1,
    limit: 10,
    strategy: "best",
    with_writer: false,
  } as const;
  // 6. Retrieve sorted comments with zero comments
  const sortedComments =
    await api.functional.communityPlatform.moderator.posts.comments.sorted.sortedComments(
      moderatorConnection,
      {
        postId: postId,
        body: sortedCommentsRequestBody,
      },
    );
  typia.assert(sortedComments);
  // 7. Validate pagination info for empty list
  TestValidator.equals(
    "pagination current page",
    sortedComments.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sortedComments.pagination.limit, 10);
  TestValidator.equals(
    "pagination total records",
    sortedComments.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages",
    sortedComments.pagination.pages,
    0,
  );
  // 8. Validate empty data array
  TestValidator.equals("empty comments list", sortedComments.data.length, 0);
}
