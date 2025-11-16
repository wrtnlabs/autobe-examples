import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Validate that PATCH /communityPlatform/posts correctly filters posts by
 * community and post type.
 *
 * Business workflow:
 *
 * 1. Platform admin joins and creates two visibility levels.
 * 2. Platform admin creates two post types ("text" and "link").
 * 3. Member user joins.
 * 4. Member user creates two communities A and B using different visibility
 *    levels.
 * 5. Member user creates multiple posts:
 *
 *    - Some in community A with post type "text" (should match filter)
 *    - Some in community A with post type "link" (should not match filter)
 *    - Some in community B with post type "text" (should not match filter)
 * 6. Call PATCH /communityPlatform/posts with body that filters by community_ids =
 *    [A.id] and post_type_ids = [textType.id], plus page/limit.
 * 7. Assert that all returned posts belong to community A and use textType.
 * 8. Assert that pagination metadata matches the number of returned posts and that
 *    no unwanted posts are included.
 */
export async function test_api_posts_index_filtered_by_community_and_post_type(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create two visibility levels
  const publicVisibilityBody = {
    code: `public-${RandomGenerator.alphabets(5)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const restrictedVisibilityBody = {
    code: `restricted-${RandomGenerator.alphabets(5)}`,
    name: "Restricted",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const publicVisibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: publicVisibilityBody },
    );
  typia.assert(publicVisibility);

  const restrictedVisibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: restrictedVisibilityBody },
    );
  typia.assert(restrictedVisibility);

  // 3. Create two post types: text and link
  const textPostTypeBody = {
    code: `text-${RandomGenerator.alphabets(5)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const linkPostTypeBody = {
    code: `link-${RandomGenerator.alphabets(5)}`,
    name: "Link Post",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const textPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: textPostTypeBody },
    );
  typia.assert(textPostType);

  const linkPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: linkPostTypeBody },
    );
  typia.assert(linkPostType);

  // 4. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 5. Create two communities A (public) and B (restricted)
  const communityABody = {
    identifier: `community-a-${RandomGenerator.alphabets(6)}`,
    title: "Community A",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: publicVisibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityBBody = {
    identifier: `community-b-${RandomGenerator.alphabets(6)}`,
    title: "Community B",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: restrictedVisibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityABody },
    );
  typia.assert(communityA);

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBBody },
    );
  typia.assert(communityB);

  // 6. Create posts:
  // - 3 posts in community A with text type (should match)
  // - 2 posts in community A with link type (should not match)
  // - 2 posts in community B with text type (should not match)
  const matchingPosts: ICommunityPlatformPost[] = [];
  const nonMatchingPosts: ICommunityPlatformPost[] = [];

  // helper to create a text post
  const createTextPost = async (
    communityId: string & tags.Format<"uuid">,
    titlePrefix: string,
  ): Promise<ICommunityPlatformPost> => {
    const body = {
      community_id: communityId,
      post_type_id: textPostType.id,
      title: `${titlePrefix} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
      body: RandomGenerator.paragraph({ sentences: 8 }),
      url: null,
      image_uri: null,
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body,
        },
      );
    typia.assert(post);
    return post;
  };

  // helper to create a link post
  const createLinkPost = async (
    communityId: string & tags.Format<"uuid">,
    titlePrefix: string,
  ): Promise<ICommunityPlatformPost> => {
    const body = {
      community_id: communityId,
      post_type_id: linkPostType.id,
      title: `${titlePrefix} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
      body: RandomGenerator.paragraph({ sentences: 4 }),
      url: "https://example.com/article",
      image_uri: null,
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body,
        },
      );
    typia.assert(post);
    return post;
  };

  // Create matching posts
  const matchingCount = 3;
  for (let i = 0; i < matchingCount; i += 1) {
    const post = await createTextPost(communityA.id, "Community A Text");
    matchingPosts.push(post);
  }

  // Create non-matching posts in community A with link type
  for (let i = 0; i < 2; i += 1) {
    const post = await createLinkPost(communityA.id, "Community A Link");
    nonMatchingPosts.push(post);
  }

  // Create non-matching posts in community B with text type
  for (let i = 0; i < 2; i += 1) {
    const post = await createTextPost(communityB.id, "Community B Text");
    nonMatchingPosts.push(post);
  }

  // 7. Call PATCH /communityPlatform/posts with filter
  const requestBody = {
    page: 1,
    limit: 20,
    community_ids: [communityA.id],
    author_memberuser_ids: undefined,
    post_type_ids: [textPostType.id],
    state_codes: undefined,
    visibility_levels: undefined,
    search_query: undefined,
    posted_from: undefined,
    posted_to: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies ICommunityPlatformPost.IRequest;

  const pageResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const summaries = pageResult.data;

  // Basic pagination assertions
  TestValidator.predicate(
    "pagination current page should be 1",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= number of returned posts",
    pagination.limit >= summaries.length,
  );
  TestValidator.predicate(
    "pagination records should be >= number of returned posts",
    pagination.records >= summaries.length,
  );

  // There must be at least the number of matching posts, though
  TestValidator.predicate(
    "pagination records should be at least as many as matching posts created",
    pagination.records >= matchingPosts.length,
  );

  // 8. Validate that all returned posts belong to community A and have text type
  for (const summary of summaries) {
    typia.assert(summary);

    TestValidator.equals(
      "every returned post should belong to community A (community_id)",
      summary.community_id,
      communityA.id,
    );

    TestValidator.equals(
      "every returned post should belong to community A (community summary id)",
      summary.community.id,
      communityA.id,
    );

    TestValidator.equals(
      "every returned post should have text post type id",
      summary.post_type.id,
      textPostType.id,
    );
  }

  // Ensure that none of the explicitly non-matching posts appear in the result
  const nonMatchingIds = nonMatchingPosts.map((p) => p.id);
  const returnedIds = summaries.map((s) => s.id);

  for (const nonMatchId of nonMatchingIds) {
    TestValidator.predicate(
      "non-matching posts should not be returned",
      returnedIds.includes(nonMatchId) === false,
    );
  }
}
