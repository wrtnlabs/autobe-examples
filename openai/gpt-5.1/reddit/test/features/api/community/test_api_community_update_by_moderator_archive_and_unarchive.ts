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

export async function test_api_community_update_by_moderator_archive_and_unarchive(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a visibility level
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    { body: adminJoinBody },
  );
  typia.assert(adminAuthorized);

  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 2. Member user joins and creates a community using that visibility level
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);

  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    { body: memberJoinBody },
  );
  typia.assert(memberAuthorized);

  const communityCreateBody = {
    identifier: `comm-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(createdCommunity);

  TestValidator.predicate(
    "initial community is not archived",
    createdCommunity.is_archived === false,
  );
  TestValidator.predicate(
    "initial community is not removed",
    createdCommunity.is_removed === false,
  );

  const originalUpdatedAt = new Date(createdCommunity.updated_at).getTime();

  // 3. Community moderator joins (and logs in) to obtain moderator context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: moderatorJoinBody,
    },
  );
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorReAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorReAuthorized);

  // 4. Archive the community via moderator update endpoint
  const archiveUpdateBody = {
    is_archived: true,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const archivedCommunity =
    await api.functional.communityPlatform.communityModerator.communities.update(
      connection,
      {
        communityIdentifier: createdCommunity.identifier,
        body: archiveUpdateBody,
      },
    );
  typia.assert(archivedCommunity);

  TestValidator.predicate(
    "archive update sets is_archived to true",
    archivedCommunity.is_archived === true,
  );
  TestValidator.equals(
    "archive update does not change is_removed flag",
    archivedCommunity.is_removed,
    createdCommunity.is_removed,
  );

  const archivedUpdatedAt = new Date(archivedCommunity.updated_at).getTime();
  TestValidator.predicate(
    "archived updated_at is not earlier than original",
    archivedUpdatedAt >= originalUpdatedAt,
  );

  // 5. Unarchive the community via moderator update endpoint
  const unarchiveUpdateBody = {
    is_archived: false,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const unarchivedCommunity =
    await api.functional.communityPlatform.communityModerator.communities.update(
      connection,
      {
        communityIdentifier: createdCommunity.identifier,
        body: unarchiveUpdateBody,
      },
    );
  typia.assert(unarchivedCommunity);

  TestValidator.predicate(
    "unarchive update sets is_archived to false",
    unarchivedCommunity.is_archived === false,
  );
  TestValidator.equals(
    "unarchive update does not change is_removed flag",
    unarchivedCommunity.is_removed,
    createdCommunity.is_removed,
  );

  const unarchivedUpdatedAt = new Date(
    unarchivedCommunity.updated_at,
  ).getTime();
  TestValidator.predicate(
    "unarchived updated_at is not earlier than archived",
    unarchivedUpdatedAt >= archivedUpdatedAt,
  );

  // 6. Ensure core identity fields remain stable across updates
  TestValidator.equals(
    "community id remains stable across updates",
    archivedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community id remains stable after unarchive",
    unarchivedCommunity.id,
    createdCommunity.id,
  );

  TestValidator.equals(
    "community identifier remains stable across updates",
    archivedCommunity.identifier,
    createdCommunity.identifier,
  );
  TestValidator.equals(
    "community identifier remains stable after unarchive",
    unarchivedCommunity.identifier,
    createdCommunity.identifier,
  );

  TestValidator.equals(
    "creator id remains stable across updates",
    archivedCommunity.creator.id,
    createdCommunity.creator.id,
  );
  TestValidator.equals(
    "creator id remains stable after unarchive",
    unarchivedCommunity.creator.id,
    createdCommunity.creator.id,
  );

  TestValidator.equals(
    "visibility level id remains stable across updates",
    archivedCommunity.visibilityLevel.id,
    createdCommunity.visibilityLevel.id,
  );
  TestValidator.equals(
    "visibility level id remains stable after unarchive",
    unarchivedCommunity.visibilityLevel.id,
    createdCommunity.visibilityLevel.id,
  );

  TestValidator.equals(
    "created_at remains stable across updates",
    archivedCommunity.created_at,
    createdCommunity.created_at,
  );
  TestValidator.equals(
    "created_at remains stable after unarchive",
    unarchivedCommunity.created_at,
    createdCommunity.created_at,
  );
}
