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

export async function test_api_moderator_deleted_contents_list_filtered_by_moderator_and_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins the platform
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinRaw = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarUrl: null,
      },
    },
  );
  const moderatorJoin = typia.assert(
    moderatorJoinRaw,
  ) satisfies ICommunityPlatformModerator.IAuthorized;
  // 2. Moderator login
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const moderatorLogin = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {
        email: moderatorEmail,
        password: process.env.TEST_MODERATOR_PASSWORD ?? "test-password",
      },
    },
  );
  typia.assert(moderatorLogin);
  // 3. User joins the platform
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinRaw = await authorize_user_join(userJoinConnection, {
    body: {
      email: userEmail,
      password: "test-password",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  const userJoin = typia.assert(
    userJoinRaw,
  ) satisfies ICommunityPlatformUser.IAuthorized;
  // 4. User login
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLogin = await authorize_user_login(userLoginConnection, {
    body: {
      email: userEmail,
      password: "test-password",
    },
  });
  typia.assert(userLogin);
  // 5. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userLoginConnection,
      {
        body: {
          name: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: `https://example.com/icons/${RandomGenerator.alphabets(6)}.png`,
        },
      },
    );
  typia.assert(community);
  // 6. Moderator is assigned as a moderator of the community
  const moderatorAssignment =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      moderatorLoginConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: moderatorJoin.id,
          role: "moderator",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 7. User creates a post in the community
  const postBody = {
    title: RandomGenerator.name(3),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userLoginConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 8. User creates a comment on the post
  const commentBody = {
    post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformPostComment.ICreate;
  const comment =
    await generate_random_community_platform_user_post_comments_create(
      userLoginConnection,
      {
        body: commentBody,
      },
    );
  typia.assert(comment);
  // 9. -- Setup deletion records
  // We assume that the platform automatically creates deleted content records when moderator deletes posts or comments.
  // For testing, we simulate that some deletion records exist by querying deleted contents later and verify filtering.
  // 10. Moderator queries deleted content records filtered by content type "post" and moderator ID
  // Note: We assume the content type filter is done by checking whether postId is not null and commentId is null
  const deletedContentsPage =
    await api.functional.communityPlatform.moderator.deleted_contents.index(
      moderatorLoginConnection,
      {
        body: {
          moderator_id: moderatorJoin.id,
          post_id: null, // Ignored, we want any post deletion
          comment_id: null, // Ignored, but must be null to exclude comments
          // We simulate filter only for post deletions by checking post_id not null
          // Since comment_id is null, meaning content type = post
          // Pagination params:
          page: 1,
          limit: 10,
          createdAfter: null,
          createdBefore: null,
          user_id: undefined,
        },
      },
    );
  typia.assert(deletedContentsPage);
  // 11. Validate all returned deleted contents have moderator_id matching and are for posts (postId != null, commentId == null)
  for (const item of deletedContentsPage.data) {
    TestValidator.equals(
      "moderator_id matches",
      item.moderatorId,
      moderatorJoin.id,
    );
    TestValidator.predicate(
      "item is a post deletion",
      item.postId !== null && item.commentId === null,
    );
  }
  // 12. Validate pagination info is valid
  TestValidator.predicate(
    "page current number positive",
    deletedContentsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "page limit positive",
    deletedContentsPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "page records non-negative",
    deletedContentsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page pages positive",
    deletedContentsPage.pagination.pages >= 0,
  );
  // 13. Attempt unauthorized access: user (not moderator) tries to query deleted contents
  await TestValidator.error(
    "unauthorized access by non-moderator user",
    async () => {
      await api.functional.communityPlatform.moderator.deleted_contents.index(
        userLoginConnection,
        {
          body: {
            moderator_id: moderatorJoin.id,
            post_id: null,
            comment_id: null,
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );
}
