import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
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

export async function test_api_admin_post_link_retrieval_and_error_cases(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario 1: Successfully retrieve detailed link content information for a valid post ID of type 'link'.
   * This involves admin join and login for authorization, creating a user to create a community, then creating a link-type post, and finally querying the admin link retrieval endpoint.
   * Verifies the response is valid and fields match expected.
   *
   * Scenario 2: Try retrieving link content for a non-link post (e.g., text) and expect 404 error.
   *
   * Scenario 3: Request link content with a non-existent UUID, expect 404 error.
   */
  // 1. Admin joins and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const knownAdminPassword = "Admin@123456";
  const adminJoinKnown = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: knownAdminPassword,
      displayName: "AdminUser",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminJoinKnown);
  const adminLoginKnown = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinKnown.email,
      password: knownAdminPassword,
    },
  });
  typia.assert(adminLoginKnown);
  // 2. User joins and logs in (to create community)
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {});
  typia.assert(userJoin);
  // 3. User creates a community via user connection
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          iconUrl: `https://example.com/icon-${RandomGenerator.alphaNumeric(6)}.png`,
        },
      },
    );
  typia.assert(community);
  // 4. User creates a link-type post in the community
  const linkPostBody = {
    title: `Link Post Example`,
    postType: "link",
    url: `https://example.org/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies ICommunityPlatformPost.ICreate;
  const linkPost =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: linkPostBody,
      },
    );
  typia.assert(linkPost);
  // 5. Admin queries the post link endpoint for the link post
  const linkContent =
    await api.functional.communityPlatform.admin.posts.link.atLink(
      adminConnection,
      {
        postId: linkPost.id,
      },
    );
  typia.assert(linkContent);
  TestValidator.equals(
    "link post link content post id matches",
    linkContent.community_platform_post_id,
    linkPost.id,
  );
  TestValidator.equals(
    "link post link content url matches",
    linkContent.url,
    linkPostBody.url,
  );
  // 6. Create a non-link post (text type)
  const textPostBody = {
    title: "Text Post Example",
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const textPost =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: textPostBody,
      },
    );
  typia.assert(textPost);
  // 7. Attempt to get link content for text post - expect 404 error
  await TestValidator.httpError(
    "retrieving link content for non-link post returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.posts.link.atLink(
        adminConnection,
        {
          postId: textPost.id,
        },
      );
    },
  );
  // 8. Attempt to get link content for non-existent post id
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieving link content for non-existent post returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.posts.link.atLink(
        adminConnection,
        {
          postId: nonExistentPostId,
        },
      );
    },
  );
}
