import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a community tag slug update causing an intra-community conflict
 * is rejected and does not accidentally succeed.
 *
 * Business context
 *
 * - Tags are scoped to communities and their slug must be unique within a given
 *   community.
 * - Platform administrators manage tag definitions at the community level.
 * - Member users create communities but should not directly manage tags via the
 *   tested admin endpoint.
 *
 * This test orchestrates a realistic multi-actor workflow:
 *
 * 1. Create and authenticate a platformAdmin actor.
 * 2. Create and authenticate a memberUser actor.
 * 3. As platformAdmin, create a visibility level that communities can use.
 * 4. As memberUser, create a community using that visibility level.
 * 5. As platformAdmin, create two tags (tagA and tagB) in the same community with
 *    distinct slugs.
 * 6. Attempt to update tagB so that its slug equals tagA's slug, expecting the
 *    backend to reject the update due to a uniqueness constraint violation.
 *
 * The test asserts that:
 *
 * - All setup operations succeed and return well-typed DTOs.
 * - The conflicting update operation throws an error when invoked.
 * - No further assumptions are made about HTTP status codes or error bodies (we
 *   only assert that an error occurs, not its exact shape), in line with the
 *   testing constraints.
 */
export async function test_api_community_tag_update_slug_conflict_in_same_community(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platformAdmin (join is enough because
  //    SDK sets Authorization header from the response token).
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!", // simple deterministic password for clarity
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register and authenticate a memberUser.
  const memberUserJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: undefined,
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // (Optional) Explicit logins are not strictly required because join
  // already issued tokens and SDK applied them, but ensure the ability to
  // switch actors is correct by performing explicit login calls when
  // changing roles.

  // 3. As platformAdmin, create a visibility level that can be referenced
  //    by communities.
  // Ensure we are authenticated as platformAdmin.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
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
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code matches request",
    visibilityCode,
    visibilityLevel.code,
  );

  // 4. As memberUser, create a community using the created visibility level.
  const memberUserLoginBody = {
    identifier: memberUserJoinBody.email,
    password: memberUserJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserLoginResult);

  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
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
    "community identifier matches request",
    community.identifier,
    communityIdentifier,
  );

  // 5. As platformAdmin, create two distinct tags in the same community.
  const platformAdminLoginForTagsBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login-tags",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginForTagsResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginForTagsBody,
    });
  typia.assert(platformAdminLoginForTagsResult);

  const tagASlug = "tag-a";
  const tagBSlug = "tag-b";

  const tagACreateBody = {
    label: "Tag A Label",
    slug: tagASlug,
    description: "First tag for uniqueness tests.",
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tagA: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: tagACreateBody,
      },
    );
  typia.assert(tagA);
  TestValidator.equals("tagA slug matches requested slug", tagASlug, tagA.slug);

  const tagBCreateBody = {
    label: "Tag B Label",
    slug: tagBSlug,
    description: "Second tag for uniqueness conflict.",
    isVisible: true,
    order: 2,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tagB: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: tagBCreateBody,
      },
    );
  typia.assert(tagB);
  TestValidator.equals("tagB slug matches requested slug", tagBSlug, tagB.slug);

  TestValidator.predicate(
    "initial tag slugs are distinct before conflict test",
    tagA.slug !== tagB.slug,
  );

  // 6. Attempt to update tagB to use tagA's slug, expecting an error.
  const conflictingUpdateBody = {
    slug: tagASlug,
  } satisfies ICommunityPlatformCommunityTag.IUpdate;

  await TestValidator.error(
    "updating tagB slug to an existing tagA slug should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.tags.update(
        connection,
        {
          communityIdentifier: community.identifier,
          tagId: tagB.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );

  // Note: We cannot re-fetch tagB to assert immutability because no GET
  // endpoint for tags is provided in the SDK list. The absence of a
  // successful update and the captured error are treated as evidence that
  // the uniqueness rule prevented the change.
}
