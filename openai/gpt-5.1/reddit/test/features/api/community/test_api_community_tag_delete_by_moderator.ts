import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that a community moderator can delete an existing community-level tag.
 *
 * Business flow:
 *
 * 1. Platform admin creates a visibility level so that a member user can create a
 *    community.
 * 2. Member user joins and creates a community referencing that visibility level.
 * 3. Community moderator joins and creates a tag for that community.
 * 4. Community moderator deletes the created tag via the erase endpoint.
 *
 * Constraints based on available SDK:
 *
 * - There is no read/list endpoint for community tags or communities in the
 *   provided SDK, so the test focuses on the successful request flow and type
 *   correctness, not on re-reading state to verify absence.
 * - There is no tag-delete API in non-moderator namespaces, so we cannot simulate
 *   an unauthorized delete attempt without calling non-existent APIs.
 */
export async function test_api_community_tag_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@platform.test`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://platform-admin.join/",
    referrer: "https://referrer.platform/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Create a visibility level using platformAdmin context
  const visibilityLevelCode = `code-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityLevelCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code matches request",
    visibilityLevel.code,
    visibilityLevelCode,
  );

  // 2. Member user joins and creates a community
  const memberUserJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.test`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://member.join/",
    referrer: "https://referrer.member/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier matches requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // 3. Community moderator joins and creates a tag for that community
  const communityModeratorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@moderator.test`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: null,
    ip: null,
    href: "https://moderator.join/",
    referrer: "https://referrer.moderator/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const tagCreateBody = {
    label: `Tag ${RandomGenerator.name(1)}`,
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isVisible: true,
    order: undefined,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const createdTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: tagCreateBody,
      },
    );
  typia.assert(createdTag);

  // 4. Community moderator deletes the created tag
  const tagId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(createdTag.id);

  await api.functional.communityPlatform.communityModerator.communities.tags.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      tagId,
    },
  );

  // As erase returns void and there is no follow-up read API in the SDK,
  // we treat the absence of error as a successful deletion.
}
