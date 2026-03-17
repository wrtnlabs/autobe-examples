import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_comments_files_create } from "../../../generate/generate_random_community_platform_member_posts_comments_files_create";
import { prepare_random_community_platform_comment_file } from "../../../prepare/prepare_random_community_platform_comment_file";

export async function test_api_comment_file_detail_active_attachment_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
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
  // NOTE:
  // The provided materials do not include APIs/utilities to create or discover
  // a concrete post/comment hierarchy. This test therefore relies on the
  // generation helper being able to operate against externally provisioned
  // valid post/comment identifiers during runtime.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const createBody = {
    original_name: `${RandomGenerator.alphabets(8)}.txt`,
    mime_type: "text/plain",
    storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}`,
    size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies ICommunityPlatformCommentFile.ICreate;
  const created =
    await generate_random_community_platform_member_posts_comments_files_create(
      memberConnection,
      {
        params: {
          postId,
          commentId,
        },
        body: createBody,
      },
    );
  typia.assert(created);
  const found =
    await api.functional.communityPlatform.admin.posts.comments.files.at(
      adminConnection,
      {
        postId,
        commentId,
        fileId: created.id,
      },
    );
  typia.assert(found);
  TestValidator.equals(
    "file id matches created attachment",
    found.id,
    created.id,
  );
  TestValidator.equals(
    "original name matches created attachment",
    found.original_name,
    created.original_name,
  );
  TestValidator.equals(
    "mime type matches created attachment",
    found.mime_type,
    created.mime_type,
  );
  TestValidator.equals(
    "storage key matches created attachment",
    found.storage_key,
    created.storage_key,
  );
  TestValidator.equals(
    "file size matches created attachment",
    found.size,
    created.size,
  );
  TestValidator.equals("attachment remains active", found.deleted_at, null);
  TestValidator.equals(
    "created timestamp matches created attachment",
    found.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated timestamp matches created attachment",
    found.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "embedded comment reference matches owning comment",
    found.comment,
    created.comment,
  );
}
