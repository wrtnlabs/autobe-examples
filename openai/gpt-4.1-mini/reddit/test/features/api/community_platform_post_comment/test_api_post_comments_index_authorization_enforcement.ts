import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_comments_index_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Attempt to retrieve comments without authorization (expect failure)
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  const filterBody: ICommunityPlatformPostComment.IRequest = {};
  await TestValidator.httpError(
    "unauthenticated access to post comments should fail",
    401,
    async () => {
      await api.functional.communityPlatform.user.posts.comments.index(
        connection,
        {
          postId: randomPostId,
          body: filterBody,
        },
      );
    },
  );
  // 2. Authenticate a new user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join({ host: connection.host }, {});
  userConnection.headers = { Authorization: `Bearer ${userAuth.token.access}` };
  // 3. Create a post as the authorized user
  const postBody =
    typia.random<ICommunityPlatformPost.ICreate>() satisfies ICommunityPlatformPost.ICreate;
  const createdPost = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: postBody,
    },
  );
  typia.assert(createdPost);
  // 4. Retrieve comments for the created post as authorized user
  const postId = (createdPost as unknown as { id: string & tags.Format<'uuid'> }).id;
  const comments =
    await api.functional.communityPlatform.user.posts.comments.index(
      userConnection,
      {
        postId: postId,
        body: filterBody,
      },
    );
  typia.assert(comments);
  // 5. Validate pagination info and data array
  TestValidator.predicate(
    "pagination data should be present",
    comments.pagination !== null && comments.data instanceof Array,
  );
}
