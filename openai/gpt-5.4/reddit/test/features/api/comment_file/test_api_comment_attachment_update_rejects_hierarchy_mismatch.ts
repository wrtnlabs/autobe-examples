import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_admin_posts_comments_files_create } from "../../../generate/generate_random_community_platform_admin_posts_comments_files_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_file } from "../../../prepare/prepare_random_community_platform_comment_file";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_attachment_update_rejects_hierarchy_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const isIdentifiedResource = (
    input: unknown,
  ): input is {
    id: string & tags.Format<"uuid">;
  } => {
    if (typeof input !== "object" || input === null) return false;
    if (!Object.prototype.hasOwnProperty.call(input, "id")) return false;
    return typeof (input as { id?: unknown }).id === "string";
  };
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const firstCommentRaw =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  TestValidator.predicate(
    "first comment exposes an identifier",
    isIdentifiedResource(firstCommentRaw),
  );
  const firstComment = firstCommentRaw as ICommunityPlatformComment & {
    id: string & tags.Format<"uuid">;
  };
  const firstCommentId = firstComment.id;
  const secondCommentRaw =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  TestValidator.predicate(
    "second comment exposes an identifier",
    isIdentifiedResource(secondCommentRaw),
  );
  const secondComment = secondCommentRaw as ICommunityPlatformComment & {
    id: string & tags.Format<"uuid">;
  };
  const secondCommentId = secondComment.id;
  TestValidator.notEquals(
    "comments used for hierarchy mismatch are different",
    firstCommentId,
    secondCommentId,
  );
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const attachment =
    await generate_random_community_platform_admin_posts_comments_files_create(
      adminConnection,
      {
        params: {
          postId: post.id,
          commentId: firstCommentId,
        },
        body: {
          original_name: `original-${RandomGenerator.alphaNumeric(6)}.txt`,
          mime_type: "text/plain",
          storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}`,
          size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<4096>
          >(),
        } satisfies ICommunityPlatformCommentFile.ICreate,
      },
    );
  typia.assert(attachment);
  const originalName = attachment.original_name;
  const originalMimeType = attachment.mime_type;
  const originalStorageKey = attachment.storage_key;
  const originalSize = attachment.size;
  const updateBody = {
    original_name: `updated-${RandomGenerator.alphaNumeric(6)}.txt`,
    mime_type: "application/pdf",
    storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}`,
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<8192>
    >(),
  } satisfies ICommunityPlatformCommentFile.IUpdate;
  await TestValidator.httpError(
    "rejects updating a file through the wrong comment hierarchy",
    [400, 404, 409],
    async () => {
      await api.functional.communityPlatform.admin.posts.comments.files.update(
        adminConnection,
        {
          postId: post.id,
          commentId: secondCommentId,
          fileId: attachment.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "baseline attachment name snapshot remains unchanged",
    originalName,
    attachment.original_name,
  );
  TestValidator.equals(
    "baseline attachment mime type snapshot remains unchanged",
    originalMimeType,
    attachment.mime_type,
  );
  TestValidator.equals(
    "baseline attachment storage key snapshot remains unchanged",
    originalStorageKey,
    attachment.storage_key,
  );
  TestValidator.equals(
    "baseline attachment size snapshot remains unchanged",
    originalSize,
    attachment.size,
  );
}
