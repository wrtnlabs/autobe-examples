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

export async function test_api_community_tag_creation_by_moderator_for_different_communities(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in, then creates a shared visibility level.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminLoggedIn,
  );

  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.paragraph({ sentences: 1 })}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 2. Member user A joins, logs in, and creates Community A.
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: "127.0.0.1",
    href: "https://app.example.com/register-a",
    referrer: "https://app.example.com/landing-a",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAAuthorized);

  const memberALoginBody = {
    identifier: memberAJoinBody.email,
    password: memberAJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login-a",
    referrer: "https://app.example.com/landing-a",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberALoggedIn);

  const communityAIdentifier = `community-a-${RandomGenerator.alphaNumeric(6)}`;
  const communityACreateBody = {
    identifier: communityAIdentifier,
    title: `Community A ${RandomGenerator.paragraph({ sentences: 1 })}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityACreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityA);
  TestValidator.equals(
    "community A identifier should match",
    communityA.identifier,
    communityAIdentifier,
  );

  // 3. Member user B joins, logs in, and creates Community B.
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: "127.0.0.1",
    href: "https://app.example.com/register-b",
    referrer: "https://app.example.com/landing-b",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBAuthorized);

  const memberBLoginBody = {
    identifier: memberBJoinBody.email,
    password: memberBJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login-b",
    referrer: "https://app.example.com/landing-b",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberBLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBLoggedIn);

  const communityBIdentifier = `community-b-${RandomGenerator.alphaNumeric(6)}`;
  const communityBCreateBody = {
    identifier: communityBIdentifier,
    title: `Community B ${RandomGenerator.paragraph({ sentences: 1 })}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: true,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityB);
  TestValidator.equals(
    "community B identifier should match",
    communityB.identifier,
    communityBIdentifier,
  );

  // 4. Community moderator joins, logs in and then creates tags for both communities.
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "127.0.0.1",
    href: "https://mod.example.com/register",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLoggedIn,
  );

  // 5. Moderator creates Tag A1 in Community A.
  const tagALabel = `Tag A1 ${RandomGenerator.paragraph({ sentences: 1 })}`;
  const tagASlug = `tag-a1-${RandomGenerator.alphaNumeric(6)}`;
  const tagACreateBody = {
    label: tagALabel,
    slug: tagASlug,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tagA: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: tagACreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityTag>(tagA);
  TestValidator.equals("tag A label should match", tagA.label, tagALabel);
  TestValidator.equals("tag A slug should match", tagA.slug, tagASlug);
  TestValidator.predicate(
    "tag A should be visible",
    () => tagA.isVisible === true,
  );

  // 6. Moderator creates Tag B1 in Community B.
  const tagBLabel = `Tag B1 ${RandomGenerator.paragraph({ sentences: 1 })}`;
  const tagBSlug = `tag-b1-${RandomGenerator.alphaNumeric(6)}`;
  const tagBCreateBody = {
    label: tagBLabel,
    slug: tagBSlug,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    isVisible: true,
    order: 2,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tagB: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: communityB.identifier,
        body: tagBCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityTag>(tagB);
  TestValidator.equals("tag B label should match", tagB.label, tagBLabel);
  TestValidator.equals("tag B slug should match", tagB.slug, tagBSlug);
  TestValidator.predicate(
    "tag B should be visible",
    () => tagB.isVisible === true,
  );

  // 7. Validate that the two tags are distinct and scoped per community via identifier usage.
  TestValidator.notEquals(
    "tag A and tag B ids should differ",
    tagA.id,
    tagB.id,
  );

  TestValidator.notEquals(
    "tag A and tag B labels should differ",
    tagA.label,
    tagB.label,
  );

  TestValidator.notEquals(
    "tag A and tag B slugs should differ",
    tagA.slug,
    tagB.slug,
  );
}
