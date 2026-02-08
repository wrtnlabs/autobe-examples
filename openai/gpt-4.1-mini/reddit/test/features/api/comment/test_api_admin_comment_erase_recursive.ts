import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_admin_comment_erase_recursive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoinResponse);
  const adminLoginResponse = await authorize_admin_login(adminConnection, {
    body: {},
  });
  typia.assert(adminLoginResponse);
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResponse = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoinResponse);
  const userLoginResponse = await authorize_user_login(userConnection, {
    body: {},
  });
  typia.assert(userLoginResponse);
  // 3. Create initial root comment (to be deleted)
  const rootCommentRaw =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      { body: {} },
    );
  typia.assert(rootCommentRaw);
  const rootComment = rootCommentRaw as ICommunityPlatformComment & { id: string & tags.Format<"uuid"> };
  // 4. Create nested child comments replying in a chain (depth 2)
  const childComment1Raw =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      { body: { parent_id: rootComment.id } },
    );
  typia.assert(childComment1Raw);
  const childComment1 = childComment1Raw as ICommunityPlatformComment & { id: string & tags.Format<"uuid"> };
  const childComment2Raw =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      { body: { parent_id: childComment1.id } },
    );
  typia.assert(childComment2Raw);
  const childComment2 = childComment2Raw as ICommunityPlatformComment & { id: string & tags.Format<"uuid"> };
  // 5. Admin deletes the root comment recursively
  await api.functional.communityPlatform.admin.comments.erase(adminConnection, {
    commentId: rootComment.id,
  });
  // 6. Validate the deleted comments are no longer retrievable
  // (Attempt to get deleted comments should fail)
  await TestValidator.error(
    "deleted root comment is not retrievable",
    async () => {
      await api.functional.communityPlatform.user.comments.create(
        userConnection,
        {
          body: { parent_id: rootComment.id },
        },
      );
    },
  );
  await TestValidator.error(
    "deleted child comment 1 is not retrievable",
    async () => {
      await api.functional.communityPlatform.user.comments.create(
        userConnection,
        {
          body: { parent_id: childComment1.id },
        },
      );
    },
  );
  await TestValidator.error(
    "deleted child comment 2 is not retrievable",
    async () => {
      await api.functional.communityPlatform.user.comments.create(
        userConnection,
        {
          body: { parent_id: childComment2.id },
        },
      );
    },
  );
  // 7. Admin attempts to delete a non-existent comment
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("delete non-existent comment", async () => {
    await api.functional.communityPlatform.admin.comments.erase(
      adminConnection,
      {
        commentId: randomUuid,
      },
    );
  });
}
