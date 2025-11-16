import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Validate that an adminUser can transition an existing user achievement from
 * an active "earned" state to a "revoked" state while properly setting the
 * revoked_at timestamp and preserving other descriptive fields.
 *
 * Business flow:
 *
 * 1. Register an adminUser account to obtain an authorized admin context.
 * 2. Using that admin context, create a baseline achievement for a given profile
 *    handle in an "earned" state.
 * 3. Issue an update that changes the status to "revoked" and sets revoked_at to
 *    the current timestamp while leaving other metadata untouched.
 * 4. Assert that the update response reflects the revoked state, that revoked_at
 *    matches the requested timestamp, and that descriptive fields like title,
 *    description, icon_uri, and category remain unchanged.
 */
export async function test_api_admin_achievement_status_transition_to_revoked(
  connection: api.IConnection,
) {
  // 1. AdminUser join to obtain authorized context
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create baseline "earned" achievement for some profile handle
  const handle: string = RandomGenerator.alphabets(10);

  const achievementCreateBody = {
    code: RandomGenerator.alphabets(10),
    category: "karma",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    icon_uri: typia.random<string & tags.Format<"uri">>(),
    status: "earned",
    earned_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const created: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle,
        body: achievementCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserAchievement>(created);

  // 3. Transition achievement to "revoked" with a specific revoked_at timestamp
  const revokedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    status: "revoked",
    revoked_at: revokedAt,
  } satisfies ICommunityPlatformUserAchievement.IUpdate;

  const updated: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.update(
      connection,
      {
        handle,
        code: created.code,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformUserAchievement>(updated);

  // 4. Assertions on lifecycle transition and field stability
  TestValidator.equals(
    "achievement status should transition to revoked",
    updated.status,
    "revoked",
  );

  TestValidator.predicate(
    "revoked_at should be set and match requested timestamp",
    updated.revoked_at !== null &&
      updated.revoked_at !== undefined &&
      updated.revoked_at === revokedAt,
  );

  // Descriptive fields should remain unchanged because we did not update them
  TestValidator.equals(
    "achievement code must remain unchanged",
    updated.code,
    created.code,
  );
  TestValidator.equals(
    "achievement category must remain unchanged",
    updated.category,
    created.category,
  );
  TestValidator.equals(
    "achievement title must remain unchanged",
    updated.title,
    created.title,
  );
  TestValidator.equals(
    "achievement description must remain unchanged",
    updated.description ?? null,
    created.description ?? null,
  );
  TestValidator.equals(
    "achievement icon_uri must remain unchanged",
    updated.icon_uri ?? null,
    created.icon_uri ?? null,
  );

  // earned_at should not be modified by the revocation
  TestValidator.equals(
    "earned_at timestamp must remain unchanged",
    updated.earned_at,
    created.earned_at,
  );

  // created_at should remain stable; updated_at may change
  TestValidator.equals(
    "created_at timestamp must remain unchanged",
    updated.created_at,
    created.created_at,
  );

  TestValidator.predicate(
    "updated_at should be same or after original updated_at",
    updated.updated_at >= created.updated_at,
  );

  // Profile association should stay the same
  TestValidator.equals(
    "profile id must remain unchanged",
    updated.profile.id,
    created.profile.id,
  );
  TestValidator.equals(
    "profile username must remain unchanged",
    updated.profile.username,
    created.profile.username,
  );
}
