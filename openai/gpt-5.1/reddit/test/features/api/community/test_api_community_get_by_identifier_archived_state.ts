import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_get_by_identifier_archived_state(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 2. Member user joins and becomes authenticated actor
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.test`,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Member user creates a community
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const initialTitle = `Community ${RandomGenerator.name(2)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: initialTitle,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community identifier should match input",
    createdCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "created community title should match input",
    createdCommunity.title,
    initialTitle,
  );

  // 4. Community moderator joins and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@moderator.test`,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://mod.example.com/signup",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  // 5. Moderator archives the community and optionally updates metadata
  const archivedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const archivedRulesSummary = RandomGenerator.paragraph({ sentences: 3 });

  const updateBody = {
    description: archivedDescription,
    rules_summary: archivedRulesSummary,
    is_archived: true,
    is_removed: false,
    visibility_level_code: visibilityCode,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communityModerator.communities.update(
      connection,
      {
        communityIdentifier,
        body: updateBody,
      },
    );
  typia.assert(updatedCommunity);

  TestValidator.equals(
    "updated community should be archived",
    updatedCommunity.is_archived,
    true,
  );
  TestValidator.equals(
    "updated community should not be removed",
    updatedCommunity.is_removed,
    false,
  );

  // Ensure timestamps reflect the update
  const createdAt = new Date(updatedCommunity.created_at).getTime();
  const updatedAt = new Date(updatedCommunity.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at after archive",
    () => updatedAt >= createdAt,
  );

  // 6. Anonymous caller fetches the community by identifier
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const fetchedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(anonymousConnection, {
      communityIdentifier,
    });
  typia.assert(fetchedCommunity);

  // 7. Business validations on anonymous GET result
  TestValidator.equals(
    "anonymous GET should return same community identifier",
    fetchedCommunity.identifier,
    updatedCommunity.identifier,
  );
  TestValidator.equals(
    "anonymous GET should return same title as updated community",
    fetchedCommunity.title,
    updatedCommunity.title,
  );
  TestValidator.equals(
    "anonymous GET should see archived flag true",
    fetchedCommunity.is_archived,
    true,
  );
  TestValidator.equals(
    "anonymous GET should see removed flag false",
    fetchedCommunity.is_removed,
    false,
  );

  const fetchedCreatedAt = new Date(fetchedCommunity.created_at).getTime();
  const fetchedUpdatedAt = new Date(fetchedCommunity.updated_at).getTime();

  TestValidator.equals(
    "created_at should be stable between update and fetch",
    fetchedCreatedAt,
    createdAt,
  );

  TestValidator.predicate(
    "fetched updated_at should be greater than or equal to created_at",
    () => fetchedUpdatedAt >= fetchedCreatedAt,
  );
}
