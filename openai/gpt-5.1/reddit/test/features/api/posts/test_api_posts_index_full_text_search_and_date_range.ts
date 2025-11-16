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

export async function test_api_posts_index_full_text_search_and_date_range(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (creates account and logs in)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Test Visibility Level",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Create a text post type
  const postTypeCode = `text_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 4. Member user joins
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedJoin);

  // Ensure member user session context by logging in explicitly as well
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip,
    href: "https://app.example.com/login",
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedLogin);

  // 5. Member user creates a community using the created visibility level code
  const communityIdentifier = `comm_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Search Test Community",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Create posts in the community
  const keyword = "KARMA_SEARCH_TOKEN";

  // 6-1. Keyword post
  const keywordPostCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: `${RandomGenerator.paragraph({ sentences: 3 })} ${keyword}`,
    body: `${keyword} ${RandomGenerator.content({ paragraphs: 1, sentenceMin: 3, sentenceMax: 6 })}`,
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const keywordPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: keywordPostCreateBody,
    });
  typia.assert(keywordPost);

  // 6-2. Non-keyword post in same community (should be excluded by search_query)
  const nonKeywordPostCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const nonKeywordPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: nonKeywordPostCreateBody,
    });
  typia.assert(nonKeywordPost);

  // 7. Compute date range around keywordPost.created_at
  const createdAt = new Date(keywordPost.created_at);
  const fromDate = new Date(createdAt.getTime() - 5 * 60 * 1000); // 5 minutes before
  const toDate = new Date(createdAt.getTime() + 5 * 60 * 1000); // 5 minutes after

  const postedFrom = fromDate.toISOString() as string &
    tags.Format<"date-time">;
  const postedTo = toDate.toISOString() as string & tags.Format<"date-time">;

  // Sanity: ensure nonKeywordPost falls inside same window by business assumption
  const nonKeywordCreatedAtDate = new Date(nonKeywordPost.created_at);
  TestValidator.predicate(
    "nonKeyword post created_at should fall within the +/-5m window of keyword post for this test",
    nonKeywordCreatedAtDate.getTime() >= fromDate.getTime() &&
      nonKeywordCreatedAtDate.getTime() <= toDate.getTime(),
  );

  // 8. Call PATCH /communityPlatform/posts with search_query and posted_from/posted_to
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    community_ids: [community.id],
    author_memberuser_ids: undefined,
    post_type_ids: [postType.id],
    state_codes: undefined,
    visibility_levels: undefined,
    search_query: keyword,
    posted_from: postedFrom,
    posted_to: postedTo,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies ICommunityPlatformPost.IRequest;

  const pageResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  // 9. Validate pagination is consistent
  TestValidator.predicate(
    "pagination limit should be >= number of returned posts",
    pageResult.pagination.limit >= pageResult.data.length,
  );
  TestValidator.predicate(
    "pagination records should be >= number of returned posts",
    pageResult.pagination.records >= pageResult.data.length,
  );

  // 10. Validate all returned posts satisfy keyword and date range constraints
  for (const summary of pageResult.data) {
    const titleContains = summary.title.includes(keyword);
    const bodyContains = (summary.body ?? "").includes(keyword);

    TestValidator.predicate(
      "every returned post must contain the keyword in title or body",
      titleContains || bodyContains,
    );

    const summaryCreatedAt = new Date(summary.created_at);
    TestValidator.predicate(
      "every returned post must have created_at within [posted_from, posted_to]",
      summaryCreatedAt.getTime() >= fromDate.getTime() &&
        summaryCreatedAt.getTime() <= toDate.getTime(),
    );
  }

  // 11. Ensure the keyword post itself is among the results
  const foundKeywordPost = pageResult.data.find((p) => p.id === keywordPost.id);
  TestValidator.predicate(
    "keyword post must be present in filtered results",
    foundKeywordPost !== undefined,
  );

  // 12. Ensure the non-keyword post is excluded (because it lacks the keyword even though it is in the date window)
  const foundNonKeywordPost = pageResult.data.find(
    (p) => p.id === nonKeywordPost.id,
  );
  TestValidator.predicate(
    "non-keyword post should be excluded from results",
    foundNonKeywordPost === undefined,
  );
}
