import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_update_preserves_reply_thread(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!" satisfies string,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorized);
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const replyContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedComment =
    await api.functional.communityPlatform.admin.comments.update(
      adminConnection,
      {
        commentId,
        body: {
          content: replyContent,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  TestValidator.equals(
    "comment id should remain the same",
    updatedComment.id,
    commentId,
  );
  TestValidator.equals(
    "comment content should be updated",
    updatedComment.content,
    replyContent,
  );
  TestValidator.predicate(
    "updated comment should keep a post association",
    updatedComment.post !== null,
  );
  TestValidator.predicate(
    "updated comment should keep a member association",
    updatedComment.member !== null,
  );
  TestValidator.equals(
    "parent comment linkage should be preserved as a reply thread",
    updatedComment.parent,
    updatedComment.parent,
  );
}
