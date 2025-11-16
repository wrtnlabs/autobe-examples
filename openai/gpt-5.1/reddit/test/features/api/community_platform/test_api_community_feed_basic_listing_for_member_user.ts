import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFeed";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Validate that a member user can retrieve a paginated community feed scoped to
 * a single community and ordered by newest posts first.
 *
 * Business flow:
 *
 * 1. Register and authenticate a member user (feed consumer, community owner).
 * 2. Register and authenticate a platform admin (configuration actor).
 * 3. As platform admin, create a community visibility level (e.g., public).
 * 4. As member user, create a community using that visibility level.
 * 5. As platform admin, create a basic text post type.
 * 6. As member user, create several posts in the created community.
 * 7. Call PATCH /communityPlatform/memberUser/feeds/community/{communityId} with
 *    page=1, a sufficiently large limit, and sort_mode="new".
 * 8. Assert pagination metadata and that all returned posts belong only to the
 *    target community.
 * 9. Assert that posts are ordered by created_at in descending order.
 */
export async function test_api_community_feed_basic_listing_for_member_user(
  connection: api.IConnection,
) {
  // 1. Register a member user (also becomes logged-in actor for memberUser APIs)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register a platform admin and become logged-in as platformAdmin
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1nP@ss",
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platform admin, create a visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Switch back to member user (login using member credentials)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAfterLogin);

  // 5. As member user, create a community using the created visibility level code
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: "Integration Test Community",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Switch to platform admin again to create a post type
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAuthorizedAfterLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedAfterLogin);

  const postTypeCreateBody = {
    code: `text_${RandomGenerator.alphaNumeric(6)}`,
    name: "Text Post",
    description: "Basic text-only post type for community feeds.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 7. Switch back to member user to create posts in the community
  const memberAuthorizedAfterSecondLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAfterSecondLogin);

  // Create several posts in the target community
  const postCount = 5;
  const createdPosts: ICommunityPlatformPost[] = [];

  for (let i = 0; i < postCount; i++) {
    const postCreateBody = {
      community_id: community.id,
      post_type_id: postType.id,
      title: `Post ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
      body: RandomGenerator.paragraph({ sentences: 8 }),
      url: null,
      image_uri: null,
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: postCreateBody,
        },
      );
    typia.assert(post);
    createdPosts.push(post);
  }

  // Ensure we have the expected number of created posts
  TestValidator.equals(
    "number of created posts should equal postCount",
    createdPosts.length,
    postCount,
  );

  // 8. Call the community feed endpoint as the member user
  const page = 1;
  const limit = 20;

  const feedRequestBody = {
    page,
    limit,
    sort_mode: "new",
  } satisfies ICommunityPlatformCommunityFeed.IRequest;

  const feedPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.memberUser.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: feedRequestBody,
      },
    );
  typia.assert(feedPage);

  const pagination = feedPage.pagination;
  const data = feedPage.data;

  // 9. Pagination assertions
  TestValidator.equals(
    "feed.current page should be 1",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "feed.limit should equal requested limit",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination.records should be at least createdPosts.length",
    pagination.records >= createdPosts.length,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 1",
    pagination.pages >= 1,
  );

  // 10. Scoping: every returned post must belong to the created community
  for (const summary of data) {
    typia.assert(summary);

    TestValidator.equals(
      "summary.community_id must match requested community.id",
      summary.community_id,
      community.id,
    );
    TestValidator.equals(
      "summary.community.id in nested community summary must match community.id",
      summary.community.id,
      community.id,
    );
  }

  // 11. Sorting: when sort_mode="new", expect posts ordered by created_at desc
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];

    const prevTime = new Date(prev.created_at).getTime();
    const currTime = new Date(curr.created_at).getTime();

    TestValidator.predicate(
      "feed items should be ordered by created_at descending when sort_mode=new",
      prevTime >= currTime,
    );
  }
}
