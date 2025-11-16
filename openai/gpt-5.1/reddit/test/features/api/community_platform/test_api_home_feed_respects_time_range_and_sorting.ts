import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformHomeFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformHomeFeed";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_home_feed_respects_time_range_and_sorting(
  connection: api.IConnection,
) {
  // 1. Member user join to become main feed consumer
  const memberJoinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: memberJoinEmail,
        password: "password-1234",
        ip: null,
        href: memberJoinHref,
        referrer: memberJoinReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  const memberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Platform admin join for configuration operations
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: adminEmail,
        password: "password-1234",
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: adminHref,
        referrer: adminReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminAuthorized);

  // 3. Create visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Visibility",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Create post type as platform admin
  const postTypeCode = `text-${RandomGenerator.alphabets(6)}`;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: postTypeCode,
          name: "Text Post",
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert(postType);

  const postTypeId: string & tags.Format<"uuid"> = postType.id;

  // 5. Switch back to member user via login to ensure correct actor context
  const memberLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberJoinEmail,
        password: "password-1234",
        ip: null,
        href: memberLoginHref,
        referrer: memberLoginReferrer,
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLoginAuthorized);
  TestValidator.equals(
    "login returns same member id as join",
    memberLoginAuthorized.id,
    memberUserId,
  );

  // 6. Create a community as the member user
  const communityIdentifier = `home-feed-${RandomGenerator.alphabets(8)}`;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  const communityId: string & tags.Format<"uuid"> = community.id;

  // 7. Create multiple posts in the community (3 posts is enough to test ordering)
  const createdPosts: ICommunityPlatformPost[] = [];

  const postCount = 3;
  for (let i = 0; i < postCount; i++) {
    const created: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: {
            community_id: communityId,
            post_type_id: postTypeId,
            title: `Home feed post #${i + 1} - ${RandomGenerator.paragraph({
              sentences: 2,
            })}`,
            body:
              i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 6 }) : null,
            url: null,
            image_uri: null,
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    typia.assert(created);
    createdPosts.push(created);
  }

  // Ensure we actually created the expected number of posts
  TestValidator.equals(
    "expected number of posts created",
    createdPosts.length,
    postCount,
  );

  // 8. Configure user feed preferences for this member user
  const userFeedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberUserId,
        body: {
          default_post_sort_mode: "new",
          show_sensitive_content: false,
          include_recommended_feeds: false,
        } satisfies ICommunityPlatformUserFeedPreferences.ICreate,
      },
    );
  typia.assert(userFeedPreferences);

  TestValidator.equals(
    "feed preferences belong to the same member user",
    userFeedPreferences.memberUser.id,
    memberUserId,
  );

  // Helper to extract ids from page data
  const collectIds = (
    page: IPageICommunityPlatformPost.ISummary,
  ): (string & tags.Format<"uuid">)[] => page.data.map((p) => p.id);

  // 9. Call home feed with sort_mode="new" and time_range="week"
  const homeRequestNew: ICommunityPlatformHomeFeed.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_mode: "new",
    time_range: "week",
    content_type_codes: undefined,
    include_recommended: undefined,
    feed_code: undefined,
  } satisfies ICommunityPlatformHomeFeed.IRequest;

  const homePageNew: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.home.index(
      connection,
      {
        body: homeRequestNew,
      },
    );
  typia.assert(homePageNew);

  // Validate basic pagination consistency
  TestValidator.predicate(
    "home feed new: limit is at least number of created posts",
    homePageNew.pagination.limit >= createdPosts.length,
  );

  // All returned posts should come from our test community (when limit small and recommendations disabled)
  for (const summaryPost of homePageNew.data) {
    TestValidator.equals(
      "home feed new: post community matches test community",
      summaryPost.community_id,
      communityId,
    );
  }

  const homeNewIds = collectIds(homePageNew);

  // Ensure all created posts are present in the new-sorted feed page
  for (const created of createdPosts) {
    TestValidator.predicate(
      "home feed new: contains each created post id",
      homeNewIds.includes(created.id),
    );
  }

  // Ensure ordering is descending by created_at for sort_mode="new" for the page data
  for (let i = 0; i < homePageNew.data.length - 1; i++) {
    const current = homePageNew.data[i];
    const next = homePageNew.data[i + 1];
    TestValidator.predicate(
      "home feed new: created_at is non-increasing",
      current.created_at >= next.created_at,
    );
  }

  // 10. Call home feed with sort_mode="top" and same time_range
  const homeRequestTop: ICommunityPlatformHomeFeed.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_mode: "top",
    time_range: "week",
    content_type_codes: undefined,
    include_recommended: undefined,
    feed_code: undefined,
  } satisfies ICommunityPlatformHomeFeed.IRequest;

  const homePageTopFirst: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.home.index(
      connection,
      {
        body: homeRequestTop,
      },
    );
  typia.assert(homePageTopFirst);

  const homePageTopSecond: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.home.index(
      connection,
      {
        body: homeRequestTop,
      },
    );
  typia.assert(homePageTopSecond);

  const homeTopIdsFirst = collectIds(homePageTopFirst);
  const homeTopIdsSecond = collectIds(homePageTopSecond);

  // Ensure that the same request twice returns the same ordering for deterministic UX
  TestValidator.equals(
    "home feed top: deterministic ordering for identical request",
    homeTopIdsFirst,
    homeTopIdsSecond,
  );

  // The top-sorted feed should at least include the created posts as well
  for (const created of createdPosts) {
    TestValidator.predicate(
      "home feed top: contains each created post id",
      homeTopIdsFirst.includes(created.id),
    );
  }

  // 11. Call home feed with explicit include_recommended override to true
  const homeRequestIncludeRecommended: ICommunityPlatformHomeFeed.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_mode: "new",
    time_range: "week",
    content_type_codes: undefined,
    include_recommended: true,
    feed_code: undefined,
  } satisfies ICommunityPlatformHomeFeed.IRequest;

  const homePageIncludeRecommended: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.home.index(
      connection,
      {
        body: homeRequestIncludeRecommended,
      },
    );
  typia.assert(homePageIncludeRecommended);

  const homeIncludeIds = collectIds(homePageIncludeRecommended);

  // Even when include_recommended is true, ensure our posts are still present
  for (const created of createdPosts) {
    TestValidator.predicate(
      "home feed include_recommended: still contains each created post id",
      homeIncludeIds.includes(created.id),
    );
  }
}
