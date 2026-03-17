import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshotFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_posts_comments_snapshots_files_create } from "../../../generate/generate_random_community_platform_admin_posts_comments_snapshots_files_create";
import { prepare_random_community_platform_comment_snapshot_file } from "../../../prepare/prepare_random_community_platform_comment_snapshot_file";

export async function test_api_comment_snapshot_file_nested_scope_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    original_name: `${RandomGenerator.alphabets(8)}.txt`,
    mime_type: "text/plain",
    storage_key: `comment-snapshot/${RandomGenerator.alphaNumeric(16)}`,
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1048576>
    >(),
  } satisfies ICommunityPlatformCommentSnapshotFile.ICreate;
  await TestValidator.httpError(
    "rejects snapshot file creation when nested post/comment/snapshot scope cannot be resolved",
    404,
    async () => {
      await generate_random_community_platform_admin_posts_comments_snapshots_files_create(
        adminConnection,
        {
          params: {
            postId,
            commentId,
            snapshotId,
          },
          body,
        },
      );
    },
  );
}
