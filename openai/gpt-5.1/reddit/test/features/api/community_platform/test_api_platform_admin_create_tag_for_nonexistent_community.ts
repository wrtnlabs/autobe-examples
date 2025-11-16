import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that platform admins cannot create community tags for non-existent
 * communities.
 *
 * Business intent
 *
 * - Ensure that when a platform administrator attempts to create a
 *   community-level tag under a communityIdentifier that does not correspond to
 *   any existing community, the API rejects the request with an error instead
 *   of silently creating data.
 * - Confirm that valid authentication and a valid tag payload are not sufficient
 *   to bypass the requirement that the target community must exist.
 *
 * Scenario steps
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join.
 *
 *    - This returns an ICommunityPlatformPlatformadmin.IAuthorized payload and
 *         installs the access token into the connection object.
 * 2. As this platform admin, create a visibility level via POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels to reflect a
 *    realistic configuration environment. This step is not strictly required
 *    for the negative test, but validates that the admin account is working and
 *    helps mimic real usage.
 * 3. Generate a clearly non-existent communityIdentifier value (for example, a
 *    random UUID string). Because this test never creates any communities, any
 *    identifier we choose will be non-existent by design.
 * 4. Attempt to create a community tag under this bogus communityIdentifier via
 *    POST
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}/tags
 *    using a valid ICommunityPlatformCommunityTag.ICreate payload.
 * 5. Assert that the tag creation call fails by wrapping it in TestValidator.error
 *    with an async closure. The test only verifies that an error is thrown; it
 *    does not depend on specific HTTP status codes or response payload shapes.
 */
export async function test_api_platform_admin_create_tag_for_nonexistent_community(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain an authenticated session.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a visibility level as this platform admin to simulate realistic setup.
  const visibilityBody = {
    code: `public-${RandomGenerator.alphabets(8)}`,
    name: `Public Visibility ${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibility);

  // 3. Generate a clearly non-existent community identifier.
  const bogusCommunityIdentifier: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Prepare a valid community tag creation payload.
  const tagBody = {
    label: `Nonexistent Community Tag ${RandomGenerator.alphabets(6)}`,
    slug: RandomGenerator.alphabets(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isVisible: true,
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  // 5. Attempt to create the tag under the bogus community and expect an error.
  await TestValidator.error(
    "creating tag for nonexistent community must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.tags.create(
        connection,
        {
          communityIdentifier: bogusCommunityIdentifier,
          body: tagBody,
        },
      );
    },
  );
}
