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

export async function test_api_comment_detail_public_top_level_comment(
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
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
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
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const originalCommentCount = post.commentCount;
  const originalPostId = post.id;
  const originalPostTitle = post.title;
  const originalPostType = post.post_type;
  const originalPostStatus = post.status;
  const originalPostCreatedAt = post.created_at;
  const originalPostUpdatedAt = post.updated_at;
  const originalPostDeletedAt = post.deleted_at;
  const originalVoteScore = post.voteScore;
  const createdComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 6 }),
          parentId: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(createdComment);
  const createdCommentUnknown: unknown = createdComment;
  const commentId: string | undefined =
    typeof createdCommentUnknown === "object" &&
    createdCommentUnknown !== null &&
    "id" in createdCommentUnknown &&
    typeof createdCommentUnknown.id === "string"
      ? createdCommentUnknown.id
      : undefined;
  TestValidator.predicate(
    "created top-level comment exposes an id for detail lookup",
    commentId !== undefined,
  );
  const guestConnection: api.IConnection = { host: connection.host };
  const detailed = await api.functional.communityPlatform.posts.comments.at(
    guestConnection,
    {
      postId: originalPostId,
      commentId: commentId!,
    },
  );
  typia.assert(detailed);
  const guestAuthorization = guestConnection.headers?.["Authorization"];
  const memberAuthorization = memberConnection.headers?.["Authorization"];
  TestValidator.predicate(
    "public read does not require authorization header",
    guestAuthorization === undefined,
  );
  TestValidator.predicate(
    "member connection remains authorized after public read",
    typeof memberAuthorization === "string" && memberAuthorization.length > 0,
  );
  TestValidator.equals(
    "post id unchanged after public read",
    post.id,
    originalPostId,
  );
  TestValidator.equals(
    "post title unchanged after public read",
    post.title,
    originalPostTitle,
  );
  TestValidator.equals(
    "post type unchanged after public read",
    post.post_type,
    originalPostType,
  );
  TestValidator.equals(
    "post status unchanged after public read",
    post.status,
    originalPostStatus,
  );
  TestValidator.equals(
    "post comment count unchanged by public read",
    post.commentCount,
    originalCommentCount,
  );
  TestValidator.equals(
    "post created_at unchanged after public read",
    post.created_at,
    originalPostCreatedAt,
  );
  TestValidator.equals(
    "post updated_at unchanged after public read",
    post.updated_at,
    originalPostUpdatedAt,
  );
  TestValidator.equals(
    "post deleted_at unchanged after public read",
    post.deleted_at,
    originalPostDeletedAt,
  );
  TestValidator.equals(
    "post vote score unchanged after public read",
    post.voteScore,
    originalVoteScore,
  );
}
