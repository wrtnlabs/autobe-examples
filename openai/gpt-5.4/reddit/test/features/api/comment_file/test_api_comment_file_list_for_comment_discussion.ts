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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_files_create } from "../../../generate/generate_random_community_platform_member_posts_comments_files_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_file } from "../../../prepare/prepare_random_community_platform_comment_file";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_file_list_for_comment_discussion(
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
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
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
  const commentId = typia.assert<{
    id: string & tags.Format<"uuid">;
  }>(comment as unknown).id;
  const fileInputs = [
    {
      original_name: "alpha-note.txt",
      mime_type: "text/plain",
      storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}-alpha.txt`,
      size: 128,
    },
    {
      original_name: "beta-note.txt",
      mime_type: "text/plain",
      storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}-beta.txt`,
      size: 256,
    },
    {
      original_name: "gamma-note.txt",
      mime_type: "text/plain",
      storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}-gamma.txt`,
      size: 512,
    },
  ] satisfies ICommunityPlatformCommentFile.ICreate[];
  const createdFiles = await ArrayUtil.asyncMap(fileInputs, async (body) => {
    const created =
      await generate_random_community_platform_member_posts_comments_files_create(
        memberConnection,
        {
          params: {
            postId: post.id,
            commentId,
          },
          body,
        },
      );
    typia.assert(created);
    return created;
  });
  const page =
    await api.functional.communityPlatform.member.posts.comments.files.index(
      memberConnection,
      {
        postId: post.id,
        commentId,
        body: {
          sort: "originalName:asc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "returned item count within limit",
    page.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination records covers visible rows",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  const createdIds = createdFiles.map((file) => file.id);
  const expectedById = new Map(createdFiles.map((file) => [file.id, file]));
  const expectedNames = [...fileInputs]
    .map((file) => file.original_name)
    .sort((a, b) => a.localeCompare(b));
  const listedNames = page.data.map((file) => file.original_name);
  TestValidator.equals(
    "all created files are listed",
    page.data.length,
    createdFiles.length,
  );
  TestValidator.equals(
    "original names sorted ascending",
    listedNames,
    expectedNames,
  );
  for (const item of page.data) {
    TestValidator.predicate(
      "listed file belongs to created set",
      createdIds.includes(item.id),
    );
    const matched = expectedById.get(item.id);
    TestValidator.predicate(
      "matched created file exists",
      matched !== undefined,
    );
    if (matched !== undefined) {
      TestValidator.equals(
        "original name matches created file",
        item.original_name,
        matched.original_name,
      );
      TestValidator.equals(
        "mime type matches created file",
        item.mime_type,
        matched.mime_type,
      );
      TestValidator.equals(
        "storage key matches created file",
        item.storage_key,
        matched.storage_key,
      );
      TestValidator.equals(
        "size matches created file",
        item.size,
        matched.size,
      );
    }
  }
}
