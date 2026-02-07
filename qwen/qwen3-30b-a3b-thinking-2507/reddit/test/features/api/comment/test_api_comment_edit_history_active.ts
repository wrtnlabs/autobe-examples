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

export async function test_api_comment_edit_history_active(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityPlatformMember.IJoin>(),
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const createdComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId },
        body: undefined,
      },
    );
  const commentId = createdComment.id;
  const editHistory =
    await api.functional.communityPlatform.member.comments.edits.index(
      memberConnection,
      {
        commentId,
        body: {},
      },
    );
  typia.assert(editHistory);
  TestValidator.equals("pagination current", editHistory.pagination.current, 1);
  TestValidator.equals("pagination limit", editHistory.pagination.limit, 25);
  TestValidator.equals("pagination records", editHistory.pagination.records, 0);
  TestValidator.equals("pagination pages", editHistory.pagination.pages, 0);
}
