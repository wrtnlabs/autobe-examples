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

export async function test_api_comment_snapshot_file_create_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    original_name: `${RandomGenerator.alphabets(8)}.png`,
    mime_type: "image/png",
    storage_key: `comment-snapshot-files/${RandomGenerator.alphaNumeric(24)}`,
    size: typia.random<number & tags.Type<"int32">>(),
  } satisfies ICommunityPlatformCommentSnapshotFile.ICreate;
  const output: ICommunityPlatformCommentSnapshotFile =
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
  typia.assert(output);
  TestValidator.notEquals(
    "association id differs from snapshot id",
    output.id,
    output.commentSnapshot.id,
  );
  TestValidator.notEquals(
    "association id differs from file id",
    output.id,
    output.commentFile.id,
  );
  TestValidator.equals(
    "snapshot id matches request",
    output.commentSnapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "original name matches input",
    output.commentFile.original_name,
    body.original_name,
  );
  TestValidator.equals(
    "mime type matches input",
    output.commentFile.mime_type,
    body.mime_type,
  );
  TestValidator.equals(
    "storage key matches input",
    output.commentFile.storage_key,
    body.storage_key,
  );
  TestValidator.equals(
    "size matches input",
    output.commentFile.size,
    body.size,
  );
  TestValidator.equals("association is active", output.deleted_at, null);
  TestValidator.equals("file is active", output.commentFile.deleted_at, null);
}
