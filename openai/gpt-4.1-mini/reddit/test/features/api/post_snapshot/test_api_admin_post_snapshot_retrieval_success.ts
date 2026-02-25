import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
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

export async function test_api_admin_post_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create an admin user and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass1234",
      displayName: "Admin Test User",
      bio: "Administrator for post snapshot tests",
      avatarUrl: null,
    },
  });
  typia.assert(adminJoinOutput);
  // Admin login to refresh token and set header
  const adminLoginOutput = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinOutput.email,
      password: "AdminPass1234",
    },
  });
  typia.assert(adminLoginOutput);
  // Create a user and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinOutput = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "UserPass1234",
      username: typia.random<string & tags.Format<"email">>().split("@")[0],
      displayName: "Test User",
      href: "https://example.com",
      referrer: "https://referrer.example.com",
      ip: null,
    },
  });
  typia.assert(userJoinOutput);
  // User login to refresh token and set header
  const userLoginOutput = await authorize_user_login(userConnection, {
    body: {
      email: userJoinOutput.email,
      password: "UserPass1234",
    },
  });
  typia.assert(userLoginOutput);
  // User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: `comm_${typia.random<string & tags.Format<"uuid">>()}`,
          description: "Test community for post snapshot",
          iconUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // Create a post in the community with type text
  const postCreateBody: ICommunityPlatformPost.ICreate = {
    title: "Test Post Title",
    postType: "text",
    content_text: "This is the content of the test post snapshot.",
    content_url: null,
    content_image_url: null,
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // Retrieve snapshot for the post - assume id of snapshot is post.id (may differ in real)
  const snapshot =
    await api.functional.communityPlatform.admin.postSnapshots.at(
      adminConnection,
      {
        id: post.id,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot fields against post and community
  TestValidator.equals("snapshot title", snapshot.title, post.title);
  if (post.postType === "text") {
    TestValidator.equals(
      "snapshot content_text",
      snapshot.content_text,
      postCreateBody.content_text,
    );
    TestValidator.equals("snapshot content_url", snapshot.content_url, null);
    TestValidator.equals(
      "snapshot content_image_url",
      snapshot.content_image_url,
      null,
    );
  } else if (post.postType === "link") {
    TestValidator.equals("snapshot content_text", snapshot.content_text, null);
    TestValidator.equals(
      "snapshot content_url",
      snapshot.content_url,
      postCreateBody.content_url,
    );
    TestValidator.equals(
      "snapshot content_image_url",
      snapshot.content_image_url,
      null,
    );
  } else if (post.postType === "image") {
    TestValidator.equals("snapshot content_text", snapshot.content_text, null);
    TestValidator.equals("snapshot content_url", snapshot.content_url, null);
    TestValidator.equals(
      "snapshot content_image_url",
      snapshot.content_image_url,
      postCreateBody.content_image_url,
    );
  }
  TestValidator.equals("snapshot post_type", snapshot.post_type, post.postType);
  TestValidator.equals(
    "snapshot author_user_id",
    snapshot.author_user_id,
    post.authorUserId ?? "",
  );
  TestValidator.equals(
    "snapshot community_id",
    snapshot.community_id,
    community.id,
  );
  TestValidator.equals(
    "snapshot vote_score",
    snapshot.vote_score,
    post.voteCount,
  );
  TestValidator.equals(
    "snapshot comment_count",
    snapshot.comment_count,
    post.commentCount,
  );
  TestValidator.predicate(
    "snapshot created_at valid",
    () => new Date(snapshot.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "snapshot updated_at valid",
    () => new Date(snapshot.updated_at).getTime() > 0,
  );
  TestValidator.equals("snapshot deleted_at", snapshot.deleted_at, null);
  // Test unauthorized access by using user connection
  await TestValidator.httpError("user unauthorized access", 403, async () => {
    await api.functional.communityPlatform.admin.postSnapshots.at(
      userConnection,
      {
        id: snapshot.id,
      },
    );
  });
}
