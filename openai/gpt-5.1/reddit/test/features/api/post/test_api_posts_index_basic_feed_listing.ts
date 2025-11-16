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
 * Basic feed listing for community posts.
 *
 * This scenario wires together minimal platform configuration (visibility level
 * and post type), member registration, community creation, and post creation,
 * and then exercises PATCH /communityPlatform/posts to verify that it returns a
 * paginated list of post summaries including the created posts.
 *
 * Steps:
 *
 * 1. Register a platform administrator via /auth/platformAdmin/join.
 * 2. As that admin, create a visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. As the same admin, create a post type via
 *    /communityPlatform/platformAdmin/postTypes.
 * 4. Register a member user via /auth/memberUser/join.
 * 5. As that member, create a community via
 *    /communityPlatform/memberUser/communities, referencing the created
 *    visibility level code.
 * 6. As the same member, create N posts in that community via
 *    /communityPlatform/memberUser/posts using ICommunityPlatformPost.ICreate.
 * 7. Call PATCH /communityPlatform/posts with a broad
 *    ICommunityPlatformPost.IRequest body (page/limit plus an optional
 *    community_ids filter) and capture the paginated result.
 * 8. Assert that pagination metadata is consistent with expectations and that the
 *    created posts are present in the returned data with correct community,
 *    author, postType, and basic lifecycle flags.
 */
export async function test_api_posts_index_basic_feed_listing(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also logs in and sets Authorization header)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type
  const postTypeCode = `text_${RandomGenerator.alphabets(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 4. Register member user (also logs in and sets Authorization header)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    ip: "127.0.0.1",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create a community as the member
  const communityIdentifier = `community_${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Create several posts in that community as the same member
  const postCount = 3;
  const createdPosts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    postCount,
    async (index) => {
      const createPostBody = {
        community_id: community.id,
        post_type_id: postType.id,
        title: `Post ${index + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
        body: RandomGenerator.paragraph({ sentences: 10 }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate;

      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body: createPostBody },
        );
      typia.assert(post);
      return post;
    },
  );

  TestValidator.equals(
    "created posts count should match postCount",
    createdPosts.length,
    postCount,
  );

  // 7. Call posts index with broad filters (limit >= created posts, filter by community)
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody: ICommunityPlatformPost.IRequest = {
    page,
    limit,
    community_ids: [community.id],
    author_memberuser_ids: undefined,
    post_type_ids: undefined,
    state_codes: undefined,
    visibility_levels: undefined,
    search_query: undefined,
    posted_from: undefined,
    posted_to: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  };

  const pageResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 8. Assertions on pagination metadata
  TestValidator.equals(
    "pagination.current should equal requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records should be >= number of created posts",
    pagination.records >= createdPosts.length,
  );

  TestValidator.predicate(
    "pagination.pages should be >= 1 when records > 0",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  // 9. Validate that all created posts appear in the returned page
  const summaries = pageResult.data;

  TestValidator.predicate(
    "summaries should contain at least as many entries as created posts when limit allows",
    summaries.length >= createdPosts.length,
  );

  for (const created of createdPosts) {
    const found = summaries.find((s) => s.id === created.id);

    TestValidator.predicate(
      `created post ${created.id} should be present in summaries`,
      !!found,
    );

    if (!found) continue;

    // Basic relationship checks; rely on typia.assert for structural validation
    TestValidator.equals(
      `summary.community_id should match community.id for post ${created.id}`,
      found.community_id,
      community.id,
    );

    TestValidator.equals(
      `summary.author_memberuser_id should match memberAuthorized.id for post ${created.id}`,
      found.author_memberuser_id,
      memberAuthorized.id,
    );

    TestValidator.equals(
      `summary.post_type.id should match postType.id for post ${created.id}`,
      found.post_type.id,
      postType.id,
    );

    TestValidator.equals(
      `summary.deleted_at should be null for freshly created post ${created.id}`,
      found.deleted_at ?? null,
      null,
    );

    TestValidator.equals(
      `summary.is_edited should be false for freshly created post ${created.id}`,
      found.is_edited,
      false,
    );
  }
}
