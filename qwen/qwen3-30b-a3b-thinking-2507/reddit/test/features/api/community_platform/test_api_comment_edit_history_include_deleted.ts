import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEdit";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentEdit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_comment_edit_history_include_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityPlatformMember.IJoin>(),
  });
  // 2. Create a post comment
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId: postId,
        body: typia.random<ICommunityPlatformComment.ICreate>(),
      },
    );
  typia.assert(comment);
  // 3. Get edit history with includeDeleted=true
  const history =
    await api.functional.communityPlatform.member.comments.edits.index(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          includeDeleted: true,
        } satisfies ICommunityPlatformCommentEdit.IRequest,
      },
    );
  typia.assert(history);
  // 4. Validate response
  TestValidator.notEquals(
    "edit history should include some entries",
    history.data.length,
    0,
  );
}
