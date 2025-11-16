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

export async function test_api_voting_rate_limit_update_prevent_unique_constraint_collision(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain platformAdmin actor context
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.test.community-platform.local/join",
    referrer: "https://admin.test.community-platform.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create two distinct voting rate limit windows for the same member user
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Common scope_type and optional community scope; choose a realistic value
  const scopeType = "global";
  const communityId: (string & tags.Format<"uuid">) | null = null;

  // Helper to create a time window: start now, end +1 hour
  const now = new Date();
  const start1 = now.toISOString() as string & tags.Format<"date-time">;
  const end1 = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const start2 = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const end2 = new Date(
    now.getTime() + 3 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const createBodyA = {
    scope_type: scopeType,
    community_platform_community_id: communityId,
    window_start: start1,
    window_end: end1,
    allowed_post_votes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    allowed_comment_votes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    post_votes_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    comment_votes_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  const windowA: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId,
        body: createBodyA,
      },
    );
  typia.assert(windowA);

  const createBodyB = {
    scope_type: scopeType,
    community_platform_community_id: communityId,
    window_start: start2,
    window_end: end2,
    allowed_post_votes: createBodyA.allowed_post_votes,
    allowed_comment_votes: createBodyA.allowed_comment_votes,
    post_votes_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    comment_votes_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  const windowB: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId,
        body: createBodyB,
      },
    );
  typia.assert(windowB);

  // Capture original snapshots for equality comparison later
  const originalWindowA: ICommunityPlatformVotingRateLimit = windowA;
  const originalWindowB: ICommunityPlatformVotingRateLimit = windowB;

  // 3. Attempt to update window B to collide with window A's unique key
  const conflictingUpdateBody = {
    scope_type: windowA.scope_type,
    community_platform_community_id:
      windowA.community?.id ?? communityId ?? null,
    window_start: windowA.window_start,
  } satisfies ICommunityPlatformVotingRateLimit.IUpdate;

  await TestValidator.error(
    "updating voting rate limit to collide with another window must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.update(
        connection,
        {
          memberUserId,
          votingRateLimitId: windowB.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );

  // 4. Re-fetch both windows to confirm no changes occurred
  const reloadedA: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
      connection,
      {
        memberUserId,
        votingRateLimitId: windowA.id,
      },
    );
  typia.assert(reloadedA);

  const reloadedB: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
      connection,
      {
        memberUserId,
        votingRateLimitId: windowB.id,
      },
    );
  typia.assert(reloadedB);

  // 5. Validate that both windows remain unchanged compared to originals
  TestValidator.equals(
    "original window A must remain unchanged after failed conflicting update",
    reloadedA,
    originalWindowA,
  );

  TestValidator.equals(
    "original window B must remain unchanged after failed conflicting update",
    reloadedB,
    originalWindowB,
  );
}
