import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_text_retrieval_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin user joins the platform.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(1),
    bio: null,
    avatarUrl: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  // 2. User joins and creates a community.
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      { body: undefined },
    );
  // 3. User creates a text post in the community.
  const postCreationBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    postType: "text",
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreationBody,
      },
    );
  typia.assert(post);
  // 4. Admin retrieves full text content of the text post
  const postText =
    await api.functional.communityPlatform.admin.posts.texts.atText(
      adminConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(postText);
  // Validate that response postId and content match
  TestValidator.equals(
    "postText.communityPlatformPostId matches post.id",
    postText.communityPlatformPostId,
    post.id,
  );
  TestValidator.equals(
    "postText.content matches post content",
    postText.content,
    postCreationBody.content,
  );
  TestValidator.predicate(
    "postText.id is valid uuid",
    /^[0-9a-f\-]{36}$/i.test(postText.id),
  );
  TestValidator.predicate(
    "postText.createdAt is iso date-time",
    typeof postText.createdAt === "string" && postText.createdAt.length > 0,
  );
  TestValidator.predicate(
    "postText.updatedAt is iso date-time",
    typeof postText.updatedAt === "string" && postText.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "postText.deletedAt is null or string",
    postText.deletedAt === null ||
      (typeof postText.deletedAt === "string" &&
        postText.deletedAt.length >= 0),
  );
}
