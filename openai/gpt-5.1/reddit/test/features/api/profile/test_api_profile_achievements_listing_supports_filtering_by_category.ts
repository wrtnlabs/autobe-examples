import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserAchievement";

/**
 * Validate that profile achievements listing supports filtering by category.
 *
 * Business flow:
 *
 * 1. Register a new memberUser, which yields a username and authenticated context.
 * 2. As that memberUser, create a community so that a user profile with the same
 *    username/handle exists in the system.
 * 3. Register a new adminUser and let the SDK attach its Authorization header.
 * 4. As adminUser, create multiple user achievements for the member profile via
 *    /communityPlatform/adminUser/profiles/{handle}/achievements:
 *
 *    - Several with category "posting";
 *    - Several with category "commenting".
 * 5. Build an unauthenticated connection (headers: {}) to simulate a public
 *    caller, then call PATCH /communityPlatform/profiles/{handle}/achievements
 *    twice using ICommunityPlatformUserAchievement.IRequest:
 *
 *    - First with category="posting";
 *    - Second with category="commenting".
 * 6. For each response, ensure:
 *
 *    - Type matches IPageICommunityPlatformUserAchievement.ISummary;
 *    - At least one achievement is returned;
 *    - Every returned summary.code belongs only to the set of codes created for the
 *         requested category and not to the other category;
 *    - Pagination metadata is consistent with data length.
 */
export async function test_api_profile_achievements_listing_supports_filtering_by_category(
  connection: api.IConnection,
) {
  // 1. Register memberUser (join) to obtain username and authenticated context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const profileHandle: string = memberAuthorized.username;

  // 2. As memberUser, create a community to ensure profile materialization
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Register adminUser via join (this will switch Authorization to admin)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As adminUser, create achievements for the member profile
  const postingCodes: string[] = [];
  const commentingCodes: string[] = [];

  const now = new Date();

  const createAchievement = async (
    codePrefix: string,
    category: string,
  ): Promise<ICommunityPlatformUserAchievement> => {
    const code = `${codePrefix}_${RandomGenerator.alphaNumeric(8)}`;
    const achievementBody = {
      code,
      category,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      icon_uri: null,
      status: "earned",
      earned_at: new Date(
        now.getTime() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000),
      ).toISOString(),
    } satisfies ICommunityPlatformUserAchievement.ICreate;

    const created: ICommunityPlatformUserAchievement =
      await api.functional.communityPlatform.adminUser.profiles.achievements.create(
        connection,
        {
          handle: profileHandle,
          body: achievementBody,
        },
      );
    typia.assert(created);
    return created;
  };

  // Create multiple posting achievements
  const postingAchievements: ICommunityPlatformUserAchievement[] = [];
  for (let i = 0; i < 3; i++) {
    const created = await createAchievement("posting", "posting");
    postingAchievements.push(created);
    postingCodes.push(created.code);
  }

  // Create multiple commenting achievements
  const commentingAchievements: ICommunityPlatformUserAchievement[] = [];
  for (let i = 0; i < 3; i++) {
    const created = await createAchievement("commenting", "commenting");
    commentingAchievements.push(created);
    commentingCodes.push(created.code);
  }

  // 5. Build an unauthenticated connection by cloning without headers
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const pageSize = 20 as number & tags.Type<"int32">;

  // Helper to assert pagination sanity
  const assertPagination = (
    titlePrefix: string,
    pagination: IPage.IPagination,
    dataLength: number,
  ): void => {
    TestValidator.equals(
      `${titlePrefix} current page should be 1`,
      pagination.current,
      1,
    );

    TestValidator.predicate(
      `${titlePrefix} limit should be >= data length`,
      pagination.limit >= dataLength,
    );

    TestValidator.predicate(
      `${titlePrefix} records should be >= data length`,
      pagination.records >= dataLength,
    );
  };

  // 6-a. Query achievements filtered by category = "posting"
  const postingRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    pageSize,
    sortBy: "granted_at" as const,
    sortDirection: "desc" as const,
    category: "posting",
    type: undefined,
    grantedFrom: undefined,
    grantedTo: undefined,
  } satisfies ICommunityPlatformUserAchievement.IRequest;

  const postingPage: IPageICommunityPlatformUserAchievement.ISummary =
    await api.functional.communityPlatform.profiles.achievements.index(
      publicConnection,
      {
        handle: profileHandle,
        body: postingRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformUserAchievement.ISummary>(postingPage);

  const postingData = postingPage.data;
  TestValidator.predicate(
    "posting filter should return at least one achievement",
    postingData.length > 0,
  );

  assertPagination(
    "posting filter",
    postingPage.pagination,
    postingData.length,
  );

  // All returned codes must be among the posting codes and not among commenting codes
  const postingCodeSet = new Set(postingCodes);
  const commentingCodeSet = new Set(commentingCodes);

  for (const summary of postingData) {
    TestValidator.predicate(
      `posting filter result code ${summary.code} must be from posting set`,
      postingCodeSet.has(summary.code),
    );
    TestValidator.predicate(
      `posting filter result code ${summary.code} must not be from commenting set`,
      !commentingCodeSet.has(summary.code),
    );
  }

  // 6-b. Query achievements filtered by category = "commenting"
  const commentingRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    pageSize,
    sortBy: "granted_at" as const,
    sortDirection: "desc" as const,
    category: "commenting",
    type: undefined,
    grantedFrom: undefined,
    grantedTo: undefined,
  } satisfies ICommunityPlatformUserAchievement.IRequest;

  const commentingPage: IPageICommunityPlatformUserAchievement.ISummary =
    await api.functional.communityPlatform.profiles.achievements.index(
      publicConnection,
      {
        handle: profileHandle,
        body: commentingRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformUserAchievement.ISummary>(commentingPage);

  const commentingData = commentingPage.data;
  TestValidator.predicate(
    "commenting filter should return at least one achievement",
    commentingData.length > 0,
  );

  assertPagination(
    "commenting filter",
    commentingPage.pagination,
    commentingData.length,
  );

  const allPostingCodesSet = new Set(postingCodes);
  const allCommentingCodesSet = new Set(commentingCodes);

  for (const summary of commentingData) {
    TestValidator.predicate(
      `commenting filter result code ${summary.code} must be from commenting set`,
      allCommentingCodesSet.has(summary.code),
    );
    TestValidator.predicate(
      `commenting filter result code ${summary.code} must not be from posting set`,
      !allPostingCodesSet.has(summary.code),
    );
  }

  // 7. Optional: ensure that combined results are subset of created codes
  const unionCodes = new Set<string>();
  for (const summary of postingData) unionCodes.add(summary.code);
  for (const summary of commentingData) unionCodes.add(summary.code);

  const createdCodesSet = new Set<string>([
    ...postingCodes,
    ...commentingCodes,
  ]);

  for (const code of unionCodes) {
    TestValidator.predicate(
      `all returned codes must be part of created achievements (${code})`,
      createdCodesSet.has(code),
    );
  }
}
