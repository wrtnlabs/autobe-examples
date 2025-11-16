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
 * Validate that a platform administrator can delete an existing community
 * created by a member user, and that deleting a non-existent community results
 * in an error.
 *
 * Business workflow covered by this E2E test:
 *
 * 1. Register a platform administrator (platformAdmin.join), which also
 *    authenticates the SDK connection as that platform admin.
 * 2. While authenticated as platformAdmin, create a visibility level that will be
 *    referenced when creating a community.
 * 3. Register a member user (memberUser.join), switching the SDK connection
 *    authentication context to the memberUser actor.
 * 4. As the memberUser, create a community using the previously created visibility
 *    level.
 * 5. Switch back to the platformAdmin actor by logging in using
 *    platformAdmin.login.
 * 6. As platformAdmin, call the DELETE
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}
 *    endpoint via api.functional.communityPlatform.platformAdmin
 *    .communities.erase to delete the created community.
 * 7. Verify that the delete call completes without throwing, and that attempting
 *    to delete a clearly non-existent community identifier raises an error,
 *    demonstrating appropriate not-found handling.
 */
export async function test_api_community_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (also authenticates as platformAdmin).
  const platformAdminUsername: string = RandomGenerator.alphabets(12);
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(16);

  const platformAdminJoinBody = {
    username: platformAdminUsername,
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 2. Create a visibility level as platformAdmin.
  const visibilityCode: string = RandomGenerator.alphaNumeric(10);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // Basic sanity check that codes match between request and response.
  TestValidator.equals(
    "visibility level code should match request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 3. Register a member user (switch connection to memberUser actor).
  const memberUsername: string = RandomGenerator.alphabets(10);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(16);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 4. As memberUser, create a community using the visibility level code.
  const communityIdentifier: string = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: Math.random() < 0.5,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // Verify that the created community references the expected visibility level.
  TestValidator.equals(
    "community visibility level code should equal created visibility code",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 5. Switch back to platformAdmin via login using email + password.
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminLoggedIn,
  );

  // 6. Perform successful deletion of the created community as platformAdmin.
  await api.functional.communityPlatform.platformAdmin.communities.erase(
    connection,
    {
      communityIdentifier: community.identifier,
    },
  );

  TestValidator.predicate(
    "successful community deletion should reach post-delete assertion",
    true,
  );

  // 7. Attempt to delete a clearly non-existent community identifier and
  //    ensure an error is thrown.
  const nonexistentIdentifier: string = `nonexistent-${RandomGenerator.alphaNumeric(20)}`;

  await TestValidator.error(
    "deleting a non-existent community should throw an error",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.erase(
        connection,
        {
          communityIdentifier: nonexistentIdentifier,
        },
      );
    },
  );
}
