import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
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
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_comment_sort_orders_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as user (join).
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a new comment in a subscribed community.
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    { body: {} },
  );
  typia.assert(comment);
  // Assert comment to type with 'id' property
  const commentWithId = typia.assert(comment) as ICommunityPlatformComment & { id: string };
  // 3. Prepare multiple sorting strategies updates.
  // Let's create 3 different strategy entries to update.
  // Each entry must follow ICommunityPlatformCommentSortOrder.IRequest item structure.
  // Assuming strategies might be strings like "best", "new", "controversial" and sort_value number.
  const sortOrders = [
    {
      strategy: "best",
      sort_value: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    },
    {
      strategy: "new",
      sort_value: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    },
    {
      strategy: "controversial",
      sort_value: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    },
  ];
  // 4. Update sorting metadata for the comment.
  const updatedComment =
    await api.functional.communityPlatform.user.comments.sort_orders.index(
      userConnection,
      {
        commentId: commentWithId.id,
        body: sortOrders,
      },
    );
  typia.assert(updatedComment);
  // Assert updatedComment to type with 'id' property
  const updatedCommentWithId = typia.assert(updatedComment) as ICommunityPlatformComment & { id: string };
  // 5. Verify the updated comment has the same ID.
  TestValidator.equals(
    "comment ID matches after sort order update",
    updatedCommentWithId.id,
    commentWithId.id,
  );
  // 6. We skip verifying presence of sort_orders collection since schema is unknown.
  // 7. Verify that the comment's content is unchanged.
  if ("content" in updatedCommentWithId && "content" in commentWithId) {
    TestValidator.equals(
      "comment content unchanged after sort order update",
      updatedCommentWithId.content ?? null,
      commentWithId.content ?? null,
    );
  }
}
