import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import type { ICommunityPlatformProfileHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfileHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileHistory";

/**
 * Test that an authenticated member can successfully retrieve the full
 * paginated edit history of their own user profile.
 *
 * 1. Register new member (acquire authentication and profile ID)
 * 2. Assign a badge to self profile (ensures history exists)
 * 3. Retrieve own profile edit history and validate shape/audit info
 * 4. Simulate multiple changes, test pagination
 * 5. Attempt access to another profile's history (should yield 403)
 * 6. Edge: non-existent profile id, missing profile id, invalid token
 */
export async function test_api_profile_edit_history_retrieval_as_member(
  connection: api.IConnection,
) {
  // 1. Register new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  const profileId = member.id;

  // 2. Assign badge to self profile (admin endpoint)
  const badge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: profileId,
        body: {
          community_platform_profile_id: profileId,
          badge_type: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 4,
            wordMax: 12,
          }),
          badge_name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformProfileBadge.ICreate,
      },
    );
  typia.assert(badge);

  // 3. Retrieve own profile edit history (should find badge assignment)
  const initialHistory =
    await api.functional.communityPlatform.member.profiles.history.index(
      connection,
      {
        profileId,
        body: {},
      },
    );
  typia.assert(initialHistory);
  TestValidator.predicate(
    "badge assignment history present",
    initialHistory.data.some(
      (h) => h.changed_by_actor !== undefined && h.change_reason === null,
    ),
  );

  // 4. Simulate multiple badge assignments and test pagination
  // (Add 15 badges; system default page limit = 20, so set limit=5 to produce 3+ pages)
  const badgeCount = 15;
  await ArrayUtil.asyncRepeat(badgeCount, async () => {
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: profileId,
        body: {
          community_platform_profile_id: profileId,
          badge_type: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 4,
            wordMax: 12,
          }),
          badge_name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformProfileBadge.ICreate,
      },
    );
  });
  // Now query with small limit
  const pageSize = 5;
  const pagedHistory =
    await api.functional.communityPlatform.member.profiles.history.index(
      connection,
      {
        profileId,
        body: { limit: pageSize },
      },
    );
  typia.assert(pagedHistory);
  TestValidator.equals(
    "pagination count matches limit",
    pagedHistory.data.length,
    pageSize,
  );
  TestValidator.predicate(
    "pagination meta present",
    pagedHistory.pagination &&
      typeof pagedHistory.pagination.current === "number" &&
      typeof pagedHistory.pagination.pages === "number",
  );
  // Check sort order is descending by changed_at
  const dates = pagedHistory.data.map((h) => h.changed_at);
  TestValidator.predicate(
    "history ordered descending by changed_at",
    dates.every((v, i, arr) => i == 0 || v <= arr[i - 1]),
  );

  // 5. Negative: attempt other profile as new member yields 403
  const attacker = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(attacker);
  // attacker now authenticated; try to retrieve history for victim
  await TestValidator.error(
    "unauthorized profile history access yields 403",
    async () => {
      await api.functional.communityPlatform.member.profiles.history.index(
        connection,
        {
          profileId,
          body: {},
        },
      );
    },
  );

  // 6. Edge: non-existent profileId, malformed, invalid token
  const fakeProfileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "non-existent profile yields 404 or 403",
    async () => {
      await api.functional.communityPlatform.member.profiles.history.index(
        connection,
        {
          profileId: fakeProfileId,
          body: {},
        },
      );
    },
  );
  // Remove token to simulate not logged in
  const unauthedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated yields 403/401", async () => {
    await api.functional.communityPlatform.member.profiles.history.index(
      unauthedConn,
      {
        profileId,
        body: {},
      },
    );
  });
  // No test for missing profileId param, as missing path param is not allowed at call site.
}
