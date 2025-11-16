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

/**
 * Verify platform admin cannot remove a non-existent community tag.
 *
 * Business goal
 *
 * - Ensure the DELETE
 *   /communityPlatform/platformAdmin/communities/{communityIdentifier}/tags/{tagId}
 *   endpoint properly rejects attempts to remove a tag association that does
 *   not exist for the given community, without creating any side effects.
 * - Validate cross-actor setup (platformAdmin vs memberUser) required to create a
 *   real community target for the delete attempt.
 *
 * Constraints from available APIs/DTOs
 *
 * - We can:
 *
 *   - Register and authenticate a platform admin via /auth/platformAdmin/join.
 *   - Register and authenticate a member user via /auth/memberUser/join.
 *   - Create a visibility level via
 *       /communityPlatform/platformAdmin/communityVisibilityLevels.create.
 *   - Create a community via /communityPlatform/memberUser/communities.create.
 *   - Issue DELETE for tag association via
 *       api.functional.communityPlatform.platformAdmin.communities.tags.erase.
 * - We CANNOT:
 *
 *   - List or inspect community tags (no listing endpoint in SDK).
 *   - Create tags explicitly (no tag creation endpoint in SDK).
 * - Therefore we cannot assert tag collections before/after; instead we validate
 *   the error behavior of the DELETE call only.
 *
 * Test strategy
 *
 * 1. Platform admin setup
 *
 *    - Call api.functional.auth.platformAdmin.join with a deterministic body built
 *         from RandomGenerator and typia.random tags.
 *    - This both creates the admin and authenticates, with token stored in
 *         connection.headers by the SDK (do not manipulate headers manually).
 *    - Typia.assert on the ICommunityPlatformPlatformadmin.IAuthorized response to
 *         ensure structural correctness.
 * 2. Visibility level provisioning (as platformAdmin)
 *
 *    - Call api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create
 *         with a simple, unique code and name (use RandomGenerator to avoid
 *         collisions).
 *    - Typia.assert on ICommunityPlatformCommunityVisibilityLevel result.
 *    - Align community visibilityLevelCode with the newly created
 *         visibilityLevel.code from the response to avoid dependence on
 *         pre-seeded values.
 * 3. Member user setup
 *
 *    - Call api.functional.auth.memberUser.join with
 *         ICommunityPlatformMemberuser.IJoinRequest.
 *    - After join, SDK sets Authorization for the memberUser; from this point,
 *         memberUser is the current actor.
 *    - Typia.assert on ICommunityPlatformMemberuser.IAuthorized response.
 * 4. Community creation (as memberUser)
 *
 *    - Build ICommunityPlatformCommunity.ICreate request body:
 *
 *         - Identifier: Random slug-like string from RandomGenerator.alphabets.
 *         - Title: RandomGenerator.paragraph.
 *         - Description: optional, set to RandomGenerator.paragraph to have realistic
 *                   text.
 *         - VisibilityLevelCode: use the visibilityLevel.code obtained in step 2.
 *         - IsNsfw: boolean (false or random).
 *         - PrimaryTagIds: omit entirely to ensure the community initially has no tag
 *                   associations; this guarantees any tagId we choose is not
 *                   associated through primaryTagIds at creation time.
 *    - Call api.functional.communityPlatform.memberUser.communities.create.
 *    - Typia.assert on ICommunityPlatformCommunity result.
 *    - Capture community.identifier for the subsequent delete attempt.
 * 5. Switch back to platformAdmin actor
 *
 *    - Call api.functional.auth.platformAdmin.login with
 *         ICommunityPlatformPlatformadmin.ILogin using the same email and
 *         password used at join.
 *    - This ensures subsequent calls to the DELETE endpoint are performed as a
 *         platformAdmin. Again, do not touch connection.headers manually; the
 *         SDK handles Authorization.
 * 6. Attempt to delete non-existent tag association
 *
 *    - Construct a random UUID tagId using typia.random<string &
 *         tags.Format<"uuid">>(). Since we never created any tag associations,
 *         this tagId cannot correspond to an actual
 *         community_platform_community_tags record for the community.
 *    - Invoke api.functional.communityPlatform.platformAdmin.communities.tags.erase
 *         with:
 *
 *         - CommunityIdentifier: community.identifier from step 4.
 *         - TagId: the random UUID from this step.
 *    - Wrap the call in TestValidator.error with an async callback, using a
 *         descriptive title such as "platform admin delete on non-existent
 *         community tag should fail".
 *    - This asserts that some error is thrown (likely HttpError 404 or 400), which
 *         is the only observable indicator of the missing association given our
 *         SDK surface.
 *    - We must not inspect HTTP status codes directly, only assert that an error
 *         occurs.
 * 7. Side-effect considerations
 *
 *    - Since we cannot list tags for the community using available SDK functions, we
 *         cannot explicitly assert that no new tags or associations were
 *         created; however, the negative delete pattern and the absence of
 *         tag-creation calls in this test is sufficient to argue that there are
 *         no unintended writes in test scope.
 *    - The primary guarantee from this test is that the DELETE call does not succeed
 *         silently when the association does not exist.
 *
 * Assertions and validation
 *
 * - Typia.assert on all non-void responses:
 *
 *   - Platform admin join and login (IAuthorized).
 *   - MemberUser join (IAuthorized).
 *   - Visibility level create (ICommunityPlatformCommunityVisibilityLevel).
 *   - Community create (ICommunityPlatformCommunity).
 * - TestValidator.error around the DELETE call to ensure failure.
 * - No additional type-level or property-level assertions beyond typia.assert.
 */
export async function test_api_platform_admin_cannot_remove_nonexistent_community_tag(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join + auto-auth)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(12);
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoin,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Create a visibility level as platformAdmin
  const visibilityCode = `vis_${RandomGenerator.alphabets(8)}`;
  const visibilityCreate = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register member user (join + auto-auth)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(10);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberJoin = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoin,
    });
  typia.assert(memberAuthorized);

  // 4. Create community as memberUser, using the visibility level code
  const communityCreate = {
    identifier: `community_${RandomGenerator.alphabets(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 5. Switch back to platformAdmin actor via login
  const adminLogin = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLogin,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 6. Attempt to delete a non-existent tag association as platformAdmin
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "platform admin delete on non-existent community tag should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.tags.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          tagId: nonExistentTagId,
        },
      );
    },
  );
}
