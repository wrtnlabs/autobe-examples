import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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

export async function test_api_post_retrieve_detail_admin_post_type_variations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${admin.token.access}`,
  };
  // 2. Prepare 3 posts of each type with distinct content
  // Since no post creation API is given, assume that random post IDs exist
  // For test, we simulate random UUIDs for post IDs
  const postTypes: ("text" | "link" | "image")[] = ["text", "link", "image"];
  // We'll mock post IDs (UUID format)
  const postIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // 3. Retrieve each post detail and validate
  await ArrayUtil.asyncForEach(postTypes, async (type, idx) => {
    // Specific post ID for this type
    const postId = postIds[idx];
    // Retrieve post details with admin authorization
    const post = await api.functional.communityPlatform.admin.posts.at(
      adminConnection,
      { postId },
    );
    typia.assert(post);
    TestValidator.equals(`postType equals for ${type}`, post.postType, type);
    // Validate title non-empty
    TestValidator.predicate(
      `title is non-empty for ${type} post`,
      post.title.length > 0,
    );
    // Author should be exactly one of authorUser or authorModerator
    const hasUser = post.authorUser !== null;
    const hasModerator = post.authorModerator !== null;
    TestValidator.predicate(
      `only one authorUser or authorModerator for ${type} post`,
      (hasUser !== hasModerator) === true,
    );
    if (hasUser) typia.assert(post.authorUser);
    if (hasModerator) typia.assert(post.authorModerator);
    typia.assert(post.community);
    // voteCount and commentCount should be number
    TestValidator.predicate(
      `voteCount is number for ${type} post`,
      typeof post.voteCount === "number",
    );
    TestValidator.predicate(
      `commentCount is number for ${type} post`,
      typeof post.commentCount === "number",
    );
    // Validate timestamps
    TestValidator.predicate(
      "createdAt is valid ISO date",
      !isNaN(Date.parse(post.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is valid ISO date",
      !isNaN(Date.parse(post.updatedAt)),
    );
    if (post.deletedAt !== null) {
      TestValidator.predicate(
        "deletedAt is valid ISO date when not null",
        !isNaN(Date.parse(post.deletedAt)),
      );
    }
  });
}
