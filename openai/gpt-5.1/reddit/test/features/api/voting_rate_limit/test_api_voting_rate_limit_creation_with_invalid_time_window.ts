import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingRateLimit";

export async function test_api_voting_rate_limit_creation_with_invalid_time_window(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authenticated context (token handled by SDK)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Choose a target memberUserId as a random UUID. In real scenarios this must match an existing
  // member user row, but for E2E here we rely on the backend fixture/simulator behavior.
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Inspect initial voting rate limit list for this member user
  const beforePage: IPageICommunityPlatformVotingRateLimit.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index(
      connection,
      { memberUserId },
    );
  typia.assert<IPageICommunityPlatformVotingRateLimit.ISummary>(beforePage);

  const beforeCount: number = beforePage.pagination.records;

  // Helper: build a base window with a valid forward-moving interval
  const now: Date = new Date();
  const start: string & tags.Format<"date-time"> = new Date(
    now.getTime(),
  ).toISOString() as string & tags.Format<"date-time">;
  const end: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // +1h

  const baseCreatePayload = {
    scope_type: "global",
    community_platform_community_id: null,
    window_start: start,
    window_end: end,
    allowed_post_votes: 100,
    allowed_comment_votes: 200,
    post_votes_count: 0,
    comment_votes_count: 0,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  // 4. Attempt an invalid creation where window_start is not before window_end.
  // We reuse the valid payload but flip the window boundaries so that
  // window_start is after window_end, which should violate business rules.
  const invalidStart: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const invalidEnd: string & tags.Format<"date-time"> = start; // earlier than invalidStart

  const invalidPayload = {
    ...baseCreatePayload,
    window_start: invalidStart,
    window_end: invalidEnd,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  await TestValidator.error(
    "creating voting rate limit with window_start >= window_end must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
        connection,
        {
          memberUserId,
          body: invalidPayload,
        },
      );
    },
  );

  // 5. Confirm that no additional rate limit record was created for the member user
  const afterInvalidPage: IPageICommunityPlatformVotingRateLimit.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index(
      connection,
      { memberUserId },
    );
  typia.assert<IPageICommunityPlatformVotingRateLimit.ISummary>(
    afterInvalidPage,
  );

  const afterInvalidCount: number = afterInvalidPage.pagination.records;
  TestValidator.equals(
    "invalid creation must not change rate limit record count",
    afterInvalidCount,
    beforeCount,
  );

  // 6. Create a valid rate limit window and verify it is persisted.
  const validPayload = baseCreatePayload;

  const created: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId,
        body: validPayload,
      },
    );
  typia.assert<ICommunityPlatformVotingRateLimit>(created);

  // 7. Re-list rate limit windows and verify one more record exists.
  const afterValidPage: IPageICommunityPlatformVotingRateLimit.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index(
      connection,
      { memberUserId },
    );
  typia.assert<IPageICommunityPlatformVotingRateLimit.ISummary>(afterValidPage);

  const afterValidCount: number = afterValidPage.pagination.records;
  TestValidator.equals(
    "valid creation must increase rate limit record count by at least one",
    afterValidCount,
    beforeCount + 1,
  );

  // Additionally, ensure that the created record's id appears in the listing.
  const hasCreated = afterValidPage.data.some(
    (summary) => summary.id === created.id,
  );
  TestValidator.predicate(
    "created voting rate limit should appear in member user's rate limit listing",
    hasCreated,
  );
}
