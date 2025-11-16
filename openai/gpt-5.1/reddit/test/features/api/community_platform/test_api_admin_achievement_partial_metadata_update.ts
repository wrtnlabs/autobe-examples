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
 * Validate that an adminUser can partially update the presentation metadata of
 * an existing achievement without changing its identity or lifecycle fields.
 *
 * Business flow:
 *
 * 1. Register and authenticate an adminUser via POST /auth/adminUser/join, which
 *    also sets the Authorization header on the shared connection.
 * 2. Assume a valid profile handle exists and use a deterministic handle string
 *    consistently for creation and update so that both operations target the
 *    same logical profile.
 * 3. Create a baseline achievement for that handle with POST
 *    /communityPlatform/adminUser/profiles/{handle}/achievements, populating
 *    code, category, title, description, icon_uri, status, and earned_at.
 * 4. Call PUT /communityPlatform/adminUser/profiles/{handle}/achievements/{code}
 *    with an ICommunityPlatformUserAchievement.IUpdate body that only modifies
 *    title, description, and icon_uri.
 * 5. Verify that the returned achievement reflects the new presentation values
 *    while preserving code, profile linkage, status, revoked_at, and
 *    created_at, and that updated_at has changed to indicate modification.
 */
export async function test_api_admin_achievement_partial_metadata_update(
  connection: api.IConnection,
) {
  // 1. AdminUser join & authentication
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd-1234" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);

  // 2. Prepare a deterministic profile handle (assumed to resolve to a
  //    valid profile in simulator/back-end context).
  const handle: string = `handle-${RandomGenerator.alphabets(8)}`;

  // 3. Create baseline achievement
  const baselineCode: string = `code-${RandomGenerator.alphaNumeric(8)}`;
  const baselineTitle: string = RandomGenerator.paragraph({ sentences: 3 });
  const baselineDescription: string = RandomGenerator.paragraph({
    sentences: 6,
  });
  const baselineIconUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const baselineStatus: string = "earned";
  const baselineEarnedAt: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();

  const createBody = {
    code: baselineCode,
    category: "karma",
    title: baselineTitle,
    description: baselineDescription,
    icon_uri: baselineIconUri,
    status: baselineStatus,
    earned_at: baselineEarnedAt,
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const before: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle,
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformUserAchievement>(before);

  // 4. Prepare partial metadata update (title, description, icon_uri only)
  const updatedTitle: string = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 5,
  });
  const updatedIconUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    icon_uri: updatedIconUri,
  } satisfies ICommunityPlatformUserAchievement.IUpdate;

  const after: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.update(
      connection,
      {
        handle,
        code: before.code,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformUserAchievement>(after);

  // 5. Assertions: identity and lifecycle unchanged
  TestValidator.equals(
    "achievement code remains unchanged",
    after.code,
    before.code,
  );

  TestValidator.equals(
    "profile id remains linked",
    after.profile.id,
    before.profile.id,
  );

  TestValidator.equals(
    "profile username remains linked",
    after.profile.username,
    before.profile.username,
  );

  TestValidator.equals(
    "status remains unchanged when not provided in update body",
    after.status,
    before.status,
  );

  TestValidator.equals(
    "revoked_at remains unchanged when not provided in update body",
    after.revoked_at ?? null,
    before.revoked_at ?? null,
  );

  // 6. Assertions: presentation metadata updated
  TestValidator.equals(
    "title is updated to new value",
    after.title,
    updatedTitle,
  );

  TestValidator.equals(
    "description is updated to new value",
    after.description ?? null,
    updatedDescription,
  );

  TestValidator.equals(
    "icon_uri is updated to new value",
    after.icon_uri ?? null,
    updatedIconUri,
  );

  // 7. Assertions: timestamps
  TestValidator.equals(
    "created_at remains original creation timestamp",
    after.created_at,
    before.created_at,
  );

  TestValidator.notEquals(
    "updated_at reflects a new modification time",
    after.updated_at,
    before.updated_at,
  );
}
