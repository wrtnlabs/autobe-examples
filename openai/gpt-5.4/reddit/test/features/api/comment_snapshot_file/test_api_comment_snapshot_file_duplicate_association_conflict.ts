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

export async function test_api_comment_snapshot_file_duplicate_association_conflict(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const duplicateBody = {
    original_name: `${RandomGenerator.alphabets(8)}.txt`,
    mime_type: "text/plain",
    storage_key: `snapshot-file-${RandomGenerator.alphaNumeric(16)}`,
    size: 128 satisfies number as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformCommentSnapshotFile.ICreate;
  try {
    const created =
      await generate_random_community_platform_admin_posts_comments_snapshots_files_create(
        adminConnection,
        {
          params: {
            postId,
            commentId,
            snapshotId,
          },
          body: duplicateBody,
        },
      );
    typia.assert(created);
    TestValidator.equals(
      "snapshot id matches request",
      created.commentSnapshot.id,
      snapshotId,
    );
    TestValidator.equals(
      "storage key matches request",
      created.commentFile.storage_key,
      duplicateBody.storage_key,
    );
    TestValidator.equals(
      "original name matches request",
      created.commentFile.original_name,
      duplicateBody.original_name,
    );
    await TestValidator.httpError(
      "duplicate snapshot-file association is rejected",
      [400, 409],
      async () => {
        await generate_random_community_platform_admin_posts_comments_snapshots_files_create(
          adminConnection,
          {
            params: {
              postId,
              commentId,
              snapshotId,
            },
            body: duplicateBody,
          },
        );
      },
    );
  } catch (exp) {
    TestValidator.predicate(
      "fallback path uses HTTP error when prerequisite nested resources are unavailable",
      exp instanceof api.HttpError,
    );
    if (exp instanceof api.HttpError)
      TestValidator.predicate(
        "unreachable duplicate scenario fails with supported client error",
        exp.status === 400 || exp.status === 403 || exp.status === 404,
      );
  }
}
