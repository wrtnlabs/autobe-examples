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
 * Validate visibility enforcement for communities with restricted visibility on
 * public GET by identifier.
 *
 * Business goal: Ensure that communities configured with a restricted/private
 * visibility level cannot be retrieved by anonymous callers using GET
 * /communityPlatform/communities/{communityIdentifier}, while still being fully
 * retrievable by an authenticated member user. This confirms that visibility is
 * enforced per caller context, not globally hiding the community.
 *
 * Steps:
 *
 * 1. Platform admin registration and restricted visibility level setup
 *
 *    - Call api.functional.auth.platformAdmin.join to create and authenticate a
 *         platform admin.
 *    - Using the platform admin context, call
 *         api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create
 *         with an ICommunityPlatformCommunityVisibilityLevel.ICreate body to
 *         register a new restricted visibility level.
 * 2. Member user registration and community creation with restricted visibility
 *
 *    - Call api.functional.auth.memberUser.join to register and authenticate a
 *         member user.
 *    - Using the member user context, call
 *         api.functional.communityPlatform.memberUser.communities.create with
 *         an ICommunityPlatformCommunity.ICreate body that:
 *
 *         - Uses a random slug-like identifier (e.g., "restricted-community-<random>").
 *         - Sets title and optional description.
 *         - Sets visibilityLevelCode to the restricted visibility level code from step 1.
 *         - Sets isNsfw to either true or false.
 *         - Optionally omits primaryTagIds for simplicity.
 *    - Capture the created community and typia.assert it as
 *         ICommunityPlatformCommunity.
 * 3. Anonymous retrieval attempt must fail
 *
 *    - Construct an anonymous connection by shallow-cloning the provided connection
 *         and overriding headers with an empty object, without mutating the
 *         original connection.headers (respecting the SDK’s token management).
 *    - With this anonymous connection, call
 *         api.functional.communityPlatform.communities.at using the restricted
 *         community identifier.
 *    - Wrap this call in TestValidator.error (with await) to assert that the
 *         anonymous retrieval fails (regardless of whether the backend chooses
 *         404 or 403), but do not check the specific HTTP status code.
 * 4. Authenticated member retrieval must succeed
 *
 *    - Using the original connection (still carrying the member user Authorization
 *         set by the join call), call
 *         api.functional.communityPlatform.communities.at again with the same
 *         identifier.
 *    - This call must succeed and return the full community.
 *    - Validate the response with typia.assert<ICommunityPlatformCommunity>().
 *    - Use TestValidator.equals to validate that:
 *
 *         - The identifier in the response equals the originally created
 *                   community.identifier.
 *         - The response.visibilityLevel.code equals the restricted visibility level’s
 *                   code from step 1.
 * 5. Business-level assertions
 *
 *    - Through the combination of steps 3 and 4, we demonstrate that
 *         restricted/private communities:
 *
 *         - Are not visible to anonymous callers via the public GET endpoint.
 *         - Remain available to authenticated member users according to their visibility
 *                   rules.
 */
export async function test_api_community_get_by_identifier_visibility_restricted(
  connection: api.IConnection,
) {
  // 1. Platform admin registration and restricted visibility level setup
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const restrictedCodeBase = `restricted-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: restrictedCodeBase,
    name: "Restricted Community Visibility",
    description:
      "Communities with this visibility are hidden from anonymous users and only visible to authorized members.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const restrictedVisibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(restrictedVisibility);

  // 2. Member user registration and community creation with restricted visibility
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityIdentifier = `restricted-community-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: restrictedVisibility.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community identifier matches request",
    createdCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "created community visibility code matches restricted visibility",
    createdCommunity.visibilityLevel.code,
    restrictedVisibility.code,
  );

  // 3. Anonymous retrieval attempt must fail
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "anonymous caller cannot retrieve restricted visibility community",
    async () => {
      await api.functional.communityPlatform.communities.at(
        anonymousConnection,
        { communityIdentifier: createdCommunity.identifier },
      );
    },
  );

  // 4. Authenticated member retrieval must succeed
  const visibleToMember: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityIdentifier: createdCommunity.identifier,
    });
  typia.assert(visibleToMember);

  // 5. Business-level assertions
  TestValidator.equals(
    "member retrieval returns same community identifier",
    visibleToMember.identifier,
    createdCommunity.identifier,
  );
  TestValidator.equals(
    "member retrieval preserves restricted visibility code",
    visibleToMember.visibilityLevel.code,
    restrictedVisibility.code,
  );
}
