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

export async function test_api_post_retrieve_detail_as_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving detailed post information by post ID as an admin user
  // 1. Admin registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Create an authorized connection with token
  const authorizedAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${adminAuth.token.access}`,
    },
  };
  // 2. Retrieve a post detail by a random postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.admin.posts.at(
    authorizedAdminConnection,
    {
      postId,
    },
  );
  typia.assert(post);
  // 3. Validate post metadata
  TestValidator.equals("post.id", post.id, postId);
  TestValidator.predicate("post.title is non-empty", post.title.length > 0);
  TestValidator.predicate(
    "post.postType is valid",
    post.postType === "text" ||
      post.postType === "link" ||
      post.postType === "image",
  );
  // Validate author details: exactly one of authorUser or authorModerator is non-null
  TestValidator.predicate(
    "authorUser or authorModerator is present",
    (post.authorUser !== null && post.authorModerator === null) ||
      (post.authorUser === null && post.authorModerator !== null),
  );
  // Validate community details subscriber count
  TestValidator.predicate(
    "community.subscriberCount non-negative",
    post.community.subscriberCount >= 0,
  );
  // Validate voteCount and commentCount are numbers (non-negative integer)
  TestValidator.predicate("voteCount non-negative", post.voteCount >= 0);
  TestValidator.predicate("commentCount non-negative", post.commentCount >= 0);
  // Validate createdAt, updatedAt timestamps
  TestValidator.predicate(
    "createdAt valid ISO date",
    !!Date.parse(post.createdAt),
  );
  TestValidator.predicate(
    "updatedAt valid ISO date",
    !!Date.parse(post.updatedAt),
  );
  // deletedAt can be null or valid ISO date if not null
  TestValidator.predicate(
    "deletedAt is null or valid ISO date",
    post.deletedAt === null || !!Date.parse(post.deletedAt),
  );
}
