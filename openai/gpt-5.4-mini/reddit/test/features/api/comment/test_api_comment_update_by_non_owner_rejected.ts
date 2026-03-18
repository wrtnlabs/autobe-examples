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

export async function test_api_comment_update_by_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies ICommunityPlatformAdmin.IJoin["password"],
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const targetComment: ICommunityPlatformComment =
    typia.random<ICommunityPlatformComment>();
  const beforeContent: string = targetComment.content;
  const beforeAuthor = targetComment.member;
  const beforePost = targetComment.post;
  const beforeParent = targetComment.parent;
  const beforeCreatedAt = targetComment.created_at;
  const beforeUpdatedAt = targetComment.updated_at;
  const beforeDeletedAt = targetComment.deleted_at;
  await TestValidator.httpError(
    "non-owner admin cannot update another member's comment",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.comments.update(
        adminConnection,
        {
          commentId: targetComment.id,
          body: {
            content: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 6,
            }),
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "comment content remains unchanged",
    targetComment.content,
    beforeContent,
  );
  TestValidator.equals(
    "comment author remains unchanged",
    targetComment.member,
    beforeAuthor,
  );
  TestValidator.equals(
    "comment post remains unchanged",
    targetComment.post,
    beforePost,
  );
  TestValidator.equals(
    "comment parent remains unchanged",
    targetComment.parent,
    beforeParent,
  );
  TestValidator.equals(
    "comment created time remains unchanged",
    targetComment.created_at,
    beforeCreatedAt,
  );
  TestValidator.equals(
    "comment updated time remains unchanged",
    targetComment.updated_at,
    beforeUpdatedAt,
  );
  TestValidator.equals(
    "comment deleted state remains unchanged",
    targetComment.deleted_at,
    beforeDeletedAt,
  );
}
