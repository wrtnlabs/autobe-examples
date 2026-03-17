import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_create_nested_reply_with_parent_context(
  connection: api.IConnection,
): Promise<void> {
  const readCommentField = (input: unknown, field: string): unknown => {
    if (typeof input !== "object" || input === null) return undefined;
    const record: Record<string, unknown> = Object(input) as Record<
      string,
      unknown
    >;
    return record[field];
  };
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
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 4 }),
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
  const parentComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
          parentId: null,
        },
      },
    );
  typia.assert(parentComment);
  const parentId = readCommentField(parentComment, "id");
  const parentParentId = readCommentField(parentComment, "parentId");
  TestValidator.predicate(
    "parent comment is represented as an object",
    typeof parentComment === "object" && parentComment !== null,
  );
  TestValidator.predicate(
    "parent comment exposes an id for reply linkage",
    typeof parentId === "string",
  );
  if (typeof parentId !== "string") {
    throw new Error("Parent comment id is required for nested reply creation.");
  }
  const replyComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 6 }),
          parentId: typia.assert<string & tags.Format<"uuid">>(parentId),
        },
      },
    );
  typia.assert(replyComment);
  const replyId = readCommentField(replyComment, "id");
  const replyParentId = readCommentField(replyComment, "parentId");
  const parentPostId = readCommentField(parentComment, "postId");
  const replyPostId = readCommentField(replyComment, "postId");
  TestValidator.predicate(
    "reply comment is represented as an object",
    typeof replyComment === "object" && replyComment !== null,
  );
  TestValidator.predicate(
    "reply comment has its own id",
    typeof replyId === "string",
  );
  TestValidator.notEquals(
    "reply is a distinct comment record",
    replyId,
    parentId,
  );
  TestValidator.equals(
    "reply references the intended parent comment",
    replyParentId,
    parentId,
  );
  TestValidator.predicate(
    "top-level parent comment does not reference another parent",
    parentParentId === null ||
      parentParentId === undefined ||
      parentParentId === "",
  );
  TestValidator.predicate(
    "reply stays in the same post thread when post identifiers are exposed",
    parentPostId === undefined ||
      replyPostId === undefined ||
      parentPostId === replyPostId,
  );
}
