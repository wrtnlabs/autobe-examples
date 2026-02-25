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

export async function test_api_post_text_retrieval_by_admin_non_text_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass1234",
      displayName: "AdminUser",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(admin);
  // 2. User join
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "UserPass1234",
      username: "user1234",
      displayName: "UserDisplay",
      href: "https://example.com",
      referrer: "https://referrer.com",
      ip: null,
    },
  });
  typia.assert(user);
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: `community_${Date.now()}`,
          description: "A community for testing",
          iconUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // 4. User creates a non-text post in the community
  // Randomly choose between link and image post
  const postType = Math.random() < 0.5 ? "link" : "image";
  let postBody: ICommunityPlatformPost.ICreate;
  if (postType === "link") {
    postBody = {
      title: "A link post",
      postType: "link",
      url: "https://example.com",
    };
  } else {
    postBody = {
      title: "An image post",
      postType: "image",
      imageUrls: [
        "https://example.com/image1.png",
        "https://example.com/image2.png",
      ],
    };
  }
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 5. Admin tries to retrieve text content for the non-text post
  await TestValidator.httpError(
    "retrieve text content for non-text post",
    404,
    async () => {
      await api.functional.communityPlatform.admin.posts.texts.atText(
        adminConnection,
        {
          postId: post.id,
        },
      );
    },
  );
}
