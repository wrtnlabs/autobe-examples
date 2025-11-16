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
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingRateLimit";

export async function test_api_voting_rate_limits_index_for_member_user_with_multiple_windows(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to get authorized connection and token
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a visibility level (not required for rate limits, but keeps config realistic)
  const visibilityBody = {
    code: `vis-${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibility);

  // 3. Create a post type for realism (not directly used in rate limit logic)
  const postTypeBody = {
    code: `post-${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeBody,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 4. Choose a member user ID. There is no member-user creation API in scope,
  // so we use a random UUID and rely on the simulator or pre-seeded data in
  // non-simulated environments.
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 5. Create multiple voting rate limit windows for that member user.
  // Use a small set of windows with non-overlapping time ranges.
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;

  type CreatedWindow = {
    id: string & tags.Format<"uuid">;
    summary: ICommunityPlatformVotingRateLimit.ISummary;
  };

  const windows: CreatedWindow[] = [];

  // Helper to format date-time as ISO string
  const toIso = (date: Date): string & tags.Format<"date-time"> =>
    date.toISOString() as string & tags.Format<"date-time">;

  // Define three non-overlapping windows
  const createSpecs = [
    {
      scope_type: "global",
      offsetHoursStart: 0,
      offsetHoursEnd: 1,
      allowed_post_votes: 10,
      allowed_comment_votes: 20,
      post_votes_count: 0,
      comment_votes_count: 0,
      communityId: null as (string & tags.Format<"uuid">) | null,
    },
    {
      scope_type: "community",
      offsetHoursStart: 1,
      offsetHoursEnd: 2,
      allowed_post_votes: 5,
      allowed_comment_votes: 15,
      post_votes_count: 1,
      comment_votes_count: 2,
      // No community creation API is available; use a random UUID to represent
      // a community-scoped window instead of reusing an unrelated entity id.
      communityId: typia.random<string & tags.Format<"uuid">>(),
    },
    {
      scope_type: "global",
      offsetHoursStart: 2,
      offsetHoursEnd: 3,
      allowed_post_votes: 100,
      allowed_comment_votes: 200,
      post_votes_count: 3,
      comment_votes_count: 4,
      communityId: null as (string & tags.Format<"uuid">) | null,
    },
  ] as const;

  for (const spec of createSpecs) {
    const windowStart = new Date(
      now.getTime() + spec.offsetHoursStart * oneHourMs,
    );
    const windowEnd = new Date(now.getTime() + spec.offsetHoursEnd * oneHourMs);

    const body = {
      scope_type: spec.scope_type,
      community_platform_community_id: spec.communityId,
      window_start: toIso(windowStart),
      window_end: toIso(windowEnd),
      allowed_post_votes: spec.allowed_post_votes as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      allowed_comment_votes: spec.allowed_comment_votes as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      post_votes_count: spec.post_votes_count as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      comment_votes_count: spec.comment_votes_count as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies ICommunityPlatformVotingRateLimit.ICreate;

    const created: ICommunityPlatformVotingRateLimit =
      await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
        connection,
        {
          memberUserId,
          body,
        },
      );
    typia.assert<ICommunityPlatformVotingRateLimit>(created);

    windows.push({
      id: created.id,
      // Copy the fields that the summary type exposes so we can compare later
      summary: {
        id: created.id,
        memberUser: created.memberUser,
        scope_type: created.scope_type,
        community_id: created.community?.id ?? null,
        window_start: created.window_start,
        window_end: created.window_end,
        post_votes_count: created.post_votes_count,
        comment_votes_count: created.comment_votes_count,
        created_at: created.created_at,
        updated_at: created.updated_at,
      },
    });
  }

  // 6. Call index to retrieve paginated voting rate limits for that member user
  const page: IPageICommunityPlatformVotingRateLimit.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index(
      connection,
      {
        memberUserId,
      },
    );
  typia.assert<IPageICommunityPlatformVotingRateLimit.ISummary>(page);

  const pagination: IPage.IPagination = page.pagination;
  const summaries: ICommunityPlatformVotingRateLimit.ISummary[] = page.data;

  // Pagination metadata basic sanity checks
  TestValidator.predicate(
    "pagination records should be >= number of created windows",
    pagination.records >= (windows.length as number),
  );
  TestValidator.predicate(
    "pagination limit should be >= number of returned summaries",
    pagination.limit >= (summaries.length as number),
  );
  TestValidator.predicate(
    "pagination pages should be >= 1 when records > 0 or 0 when no records",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  // 7. For each created window, ensure a matching summary exists in the page
  for (const created of windows) {
    const found = summaries.find((s) => s.id === created.id);

    TestValidator.predicate(
      `summary should exist for created rate limit window ${created.id}`,
      found !== undefined,
    );

    if (found !== undefined) {
      // Member user identity should match
      TestValidator.equals(
        `member user id should match for window ${created.id}`,
        found.memberUser.id,
        created.summary.memberUser.id,
      );

      // Scope type and community relationship
      TestValidator.equals(
        `scope_type should match for window ${created.id}`,
        found.scope_type,
        created.summary.scope_type,
      );
      TestValidator.equals(
        `community_id should match for window ${created.id}`,
        found.community_id ?? null,
        created.summary.community_id ?? null,
      );

      // Window boundaries
      TestValidator.equals(
        `window_start should match for window ${created.id}`,
        found.window_start,
        created.summary.window_start,
      );
      TestValidator.equals(
        `window_end should match for window ${created.id}`,
        found.window_end,
        created.summary.window_end,
      );

      // Counters
      TestValidator.equals(
        `post_votes_count should match for window ${created.id}`,
        found.post_votes_count,
        created.summary.post_votes_count,
      );
      TestValidator.equals(
        `comment_votes_count should match for window ${created.id}`,
        found.comment_votes_count,
        created.summary.comment_votes_count,
      );

      // Timestamps exist and are consistent
      TestValidator.equals(
        `created_at should match for window ${created.id}`,
        found.created_at,
        created.summary.created_at,
      );
      TestValidator.equals(
        `updated_at should match for window ${created.id}`,
        found.updated_at,
        created.summary.updated_at,
      );
    }
  }
}
