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
 * Validate that creating multiple communities with the same identifier enforces
 * uniqueness.
 *
 * Business flow:
 *
 * 1. Platform admin self-registers and becomes authenticated.
 * 2. Platform admin creates a visibility level master data entry with a unique
 *    code.
 * 3. A member user self-registers and becomes authenticated.
 * 4. The member user creates a community with a specific identifier using the
 *    created visibility level code.
 * 5. The same member user attempts to create another community with the same
 *    identifier.
 * 6. The second creation must fail, proving uniqueness enforcement on identifier.
 */
export async function test_api_multiple_communities_creation_and_identifier_uniqueness(
  connection: api.IConnection,
) {
  // 1. Platform admin join to obtain authenticated admin session
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code must match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user join to obtain authenticated member session
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates the first community with a specific identifier
  const communityIdentifier = `unique-${RandomGenerator.alphaNumeric(10)}`;
  const firstCommunityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const firstCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: firstCommunityCreateBody,
      },
    );
  typia.assert(firstCommunity);

  TestValidator.equals(
    "first community identifier must equal requested identifier",
    firstCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "first community visibility level code must equal created visibility code",
    firstCommunity.visibilityLevel.code,
    visibilityCode,
  );

  // 5. Attempt to create a second community with the same identifier
  const secondCommunityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: true,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  await TestValidator.error(
    "creating a second community with the same identifier must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        {
          body: secondCommunityCreateBody,
        },
      );
    },
  );
}
