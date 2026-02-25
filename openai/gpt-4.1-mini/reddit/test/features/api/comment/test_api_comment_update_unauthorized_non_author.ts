import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create_comment } from "../../../generate/generate_random_community_platform_user_comments_create_comment";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_comment_update_unauthorized_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate and join as user A
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {});
  typia.assert(userA);
  // 2. Create a comment by user A
  const commentByUserA =
    await generate_random_community_platform_user_comments_create_comment(
      userAConnection,
      {
        body: {
          content: "Original comment by user A",
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(commentByUserA);
  // 3. Authenticate and join as user B
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {});
  typia.assert(userB);
  // 4. Attempt to update user A's comment using user B's connection
  const updateBody = {
    content: "Unauthorized update attempt by user B",
  } satisfies ICommunityPlatformComment.IUpdate;
  await TestValidator.httpError(
    "should forbid comment update by non-author (403)",
    403,
    async () => {
      await api.functional.communityPlatform.user.comments.update(
        userBConnection,
        {
          commentId: commentByUserA.id,
          body: updateBody,
        },
      );
    },
  );
}
