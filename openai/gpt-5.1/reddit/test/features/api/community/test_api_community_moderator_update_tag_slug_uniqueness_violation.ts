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
 * Ensure community tag slug uniqueness is enforced on update for a moderator.
 *
 * Business context: A community moderator can manage tags within a community.
 * Tag slugs are machine-friendly identifiers that must be unique per community.
 * If a moderator tries to update one tag's slug so that it collides with
 * another existing tag's slug in the same community, the backend should reject
 * the operation and leave stored tag data unchanged.
 *
 * End-to-end scenario:
 *
 * 1. Register and authenticate a platform admin, which is required to configure
 *    visibility levels.
 * 2. As platform admin, create a community visibility level and capture its
 *    business code.
 * 3. Register and authenticate a member user.
 * 4. As member user, create a community using the previously-created visibility
 *    level; capture its identifier for later tag operations.
 * 5. Register and authenticate a community moderator actor.
 * 6. As community moderator, create two tags in the same community: Tag A with
 *    slug "topic-a" and Tag B with slug "topic-b"; capture both tag ids.
 * 7. Attempt to update Tag B's slug to "topic-a" via the moderator tag update
 *    endpoint.
 * 8. Assert that the update fails (throws) due to the slug uniqueness constraint.
 *    Because we do not have a tag read endpoint, we only validate that an error
 *    is raised, not post-update state re-reading.
 */
export async function test_api_community_moderator_update_tag_slug_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticates and sets Authorization)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `platform-admin-${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // simple deterministic password
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a community visibility level as platform admin
  const visibilityCode = `community-vis-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Community Test Visibility",
    description: "Visibility level used only for E2E slug uniqueness test.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register member user (auto-authenticates as memberUser)
  const memberUsername = `member_${RandomGenerator.alphabets(8)}`;
  const memberEmail = `member-${RandomGenerator.alphabets(8)}@example.com`;
  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail as string & tags.Format<"email">,
    password: "MemberP@ss1",
    ip: undefined,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create community as member user
  const communityIdentifier = `community-${RandomGenerator.alphabets(10)}`;
  const communityTitle = `Community ${RandomGenerator.name(2)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: "Community used to test moderator tag slug uniqueness.",
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 5. Register community moderator (auto-authenticates)
  const moderatorUsername = `moderator_${RandomGenerator.alphabets(8)}`;
  const moderatorEmail = `moderator-${RandomGenerator.alphabets(8)}@example.com`;
  const moderatorJoinBody = {
    username: moderatorUsername,
    email: moderatorEmail as string & tags.Format<"email">,
    password: "ModeratorP@ss1",
    display_name: null,
    ip: undefined,
    href: "https://moderator.example.com/signup",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // Optional explicit moderator login to demonstrate actor switching
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: "ModeratorP@ss1",
    ip: undefined,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/signup",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 6. As community moderator, create Tag A with slug "topic-a"
  const tagACreateBody = {
    label: "Topic A",
    slug: "topic-a",
    description: "Tag A for slug uniqueness test.",
    isVisible: true,
    order: undefined,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tagA: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: tagACreateBody,
      },
    );
  typia.assert(tagA);
  TestValidator.equals("Tag A slug should be 'topic-a'", tagA.slug, "topic-a");

  // 6b. Create Tag B with slug "topic-b"
  const tagBCreateBody = {
    label: "Topic B",
    slug: "topic-b",
    description: "Tag B for slug uniqueness test.",
    isVisible: true,
    order: undefined,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tagB: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: tagBCreateBody,
      },
    );
  typia.assert(tagB);
  TestValidator.equals("Tag B slug should be 'topic-b'", tagB.slug, "topic-b");

  // 7. Attempt to update Tag B's slug to collide with Tag A's slug
  const duplicateSlugUpdateBody = {
    slug: "topic-a",
  } satisfies ICommunityPlatformCommunityTag.IUpdate;

  await TestValidator.error(
    "updating Tag B slug to existing Tag A slug should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.tags.update(
        connection,
        {
          communityIdentifier: community.identifier,
          tagId: tagB.id,
          body: duplicateSlugUpdateBody,
        },
      );
    },
  );
}
