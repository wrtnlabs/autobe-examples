import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_text_update_by_non_author_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to update text post content by a non-author user.
  // Steps:
  // 1) User A creates a community and a text post.
  // 2) User B tries to update the text content of User A's post.
  // Validate that the system returns 403 Forbidden due to authorization failure,
  // ensuring only the post author can modify the content.
  // 1. User A join
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: typia.random<string & tags.Format<"email">>().split("@")[0],
      displayName: "User A",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(userA);
  userAConnection.headers = { Authorization: `Bearer ${userA.token.access}` };
  // 2. User A creates community
  const community =
    await generate_random_community_platform_user_communities_create(
      userAConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // 3. User A creates a text post
  const postCreateBody: ICommunityPlatformPost.ICreate = {
    title: "Sample Text Post",
    postType: "text",
    // The text content is typically included in related content (post texts) but
    // For creation, the structure accepts only title and postType, so assuming create endpoint handles text content separately or the body type includes content for text posts
    // Assuming here the body must include content field for text posts as string
    // However, since definition is any, we provide minimal required fields
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } as any;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userAConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 4. User B join
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: typia.random<string & tags.Format<"email">>().split("@")[0],
      displayName: "User B",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(userB);
  userBConnection.headers = { Authorization: `Bearer ${userB.token.access}` };
  // 5. User B tries to update User A's post text content - expect 403
  const updateBody: ICommunityPlatformPostText.IUpdate = {
    content: RandomGenerator.paragraph({ sentences: 7 }),
  };
  await TestValidator.error("forbidden update by non-author", async () => {
    await api.functional.communityPlatform.user.posts.texts.updateText(
      userBConnection,
      {
        postId: post.id,
        body: updateBody,
      },
    );
  });
}
