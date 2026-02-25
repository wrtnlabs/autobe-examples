import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeletedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_moderators_create_moderator } from "../../../generate/generate_random_community_platform_moderator_communities_moderators_create_moderator";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_post_comments_create } from "../../../generate/generate_random_community_platform_user_post_comments_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post_comment } from "../../../prepare/prepare_random_community_platform_post_comment";

export async function test_api_moderator_deleted_contents_list_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarUrl: null
      },
    },
  );
  typia.assert(moderatorAuthorized);
  // 2. Moderator login
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const modLoginPassword = moderatorPassword; // use the same password for login
  const moderatorAuthorizedCast = typia.assert<{
    email: string & tags.Format<"email">;
    id: string;
  }>(moderatorAuthorized);
  const moderatorLoggedIn = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {
        email: moderatorAuthorizedCast.email,
        password: modLoginPassword,
      },
    },
  );
  typia.assert(moderatorLoggedIn);
  // Use logged in moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: moderatorLoggedIn.token.access,
  };
  // 3. Moderator creates a community
  const moderatorCommunity =
    await generate_random_community_platform_user_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(moderatorCommunity);
  // 4. Moderator assigned as moderator
  const modAssignment =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      moderatorConnection,
      {
        params: { communityId: moderatorCommunity.id },
        body: {
          communityModeratorId: moderatorAuthorizedCast.id,
          role: "owner",
        },
      },
    );
  typia.assert(modAssignment);
  // 5. User joins
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user-password",
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/",
      referrer: "https://referrer.com/",
      ip: null,
    },
  });
  typia.assert(userAuthorized);
  // 6. User login
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLoggedIn = await authorize_user_login(userLoginConnection, {
    body: {
      email: userAuthorized.email,
      password: "user-password",
    },
  });
  typia.assert(userLoggedIn);
  // Use logged in user connection
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: userLoggedIn.token.access };
  // 7. User creates a community
  const userCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(userCommunity);
  // 8. User creates a post in the community
  const postBody: ICommunityPlatformPost.ICreate = {
    postType: "text",
    title: RandomGenerator.name(2),
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } as any;
  const userPost =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: userCommunity.id,
        body: postBody,
      },
    );
  typia.assert(userPost);
  // 9. User creates comments on post
  const comment1 =
    await generate_random_community_platform_user_post_comments_create(
      userConnection,
      {
        body: {
          post_id: userPost.id,
          content_text: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_community_platform_user_post_comments_create(
      userConnection,
      {
        body: {
          post_id: userPost.id,
          content_text: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: comment1.id,
        },
      },
    );
  typia.assert(comment2);
  // 10. Moderator queries deleted content list without filter
  const deletedContentsPage =
    await api.functional.communityPlatform.moderator.deleted_contents.index(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(deletedContentsPage);
  // 11. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page number must be >= 0",
    deletedContentsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be >= 0",
    deletedContentsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination record count must be >= 0",
    deletedContentsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count must be >= 0",
    deletedContentsPage.pagination.pages >= 0,
  );
  // 12. Confirm all deleted contents belong to communities moderated by moderator
  for (const deletedContent of deletedContentsPage.data) {
    TestValidator.equals(
      "moderator Id must match",
      deletedContent.moderatorId,
      moderatorAuthorizedCast.id,
    );
  }
}
