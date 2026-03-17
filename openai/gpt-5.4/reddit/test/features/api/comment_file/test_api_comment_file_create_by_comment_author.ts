import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_files_create } from "../../../generate/generate_random_community_platform_member_posts_comments_files_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_file } from "../../../prepare/prepare_random_community_platform_comment_file";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_file_create_by_comment_author(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 6 }),
          parentId: null,
        },
      },
    );
  typia.assert(comment);
  const commentRecord: Record<string, unknown> = comment as Record<
    string,
    unknown
  >;
  const rawCommentId = commentRecord["id"];
  TestValidator.predicate(
    "comment response exposes id for nested file route",
    typeof rawCommentId === "string",
  );
  const commentId = rawCommentId as string & tags.Format<"uuid">;
  const fileBody = {
    original_name: `${RandomGenerator.alphabets(8)}.png`,
    mime_type: "image/png",
    storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}-${RandomGenerator.alphabets(6)}.png`,
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1048576>
    >() satisfies number as number,
  } satisfies ICommunityPlatformCommentFile.ICreate;
  const attachment =
    await generate_random_community_platform_member_posts_comments_files_create(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId,
        },
        body: fileBody,
      },
    );
  typia.assert(attachment);
  TestValidator.notEquals(
    "attachment id should be newly generated",
    attachment.id,
    attachment.storage_key,
  );
  TestValidator.equals(
    "original name should match request",
    attachment.original_name,
    fileBody.original_name,
  );
  TestValidator.equals(
    "mime type should match request",
    attachment.mime_type,
    fileBody.mime_type,
  );
  TestValidator.equals(
    "storage key should match request",
    attachment.storage_key,
    fileBody.storage_key,
  );
  TestValidator.equals(
    "size should match request",
    attachment.size,
    fileBody.size,
  );
  TestValidator.predicate(
    "created_at should be present",
    attachment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be present",
    attachment.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should remain null",
    attachment.deleted_at,
    null,
  );
}
