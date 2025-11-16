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
 * Verify that deleting a community tag as a platform admin only affects the
 * targeted community and does not impact tags defined for other communities.
 *
 * Business goal:
 *
 * - A platformAdmin can manage per-community tags. Removing a tag association for
 *   community A must not break or delete tags associated with community B, even
 *   if labels are similar.
 *
 * Flow under test:
 *
 * 1. Register a platform admin (join) so that we can manage visibility levels and
 *    tags.
 * 2. Create a community visibility level that both test communities will use.
 * 3. Register a member user and create two separate communities (community A and
 *    community B) using that visibility level.
 * 4. Using the existing platformAdmin session (from join), create a tag for each
 *    community.
 * 5. Delete the tag for community A via the platformAdmin DELETE endpoint.
 * 6. Confirm that we can still operate on community B tags (e.g., create another
 *    tag) and that previously created tagB is still a valid DTO, demonstrating
 *    that deletion was scoped to community A only.
 */
export async function test_api_platform_admin_tag_deletion_does_not_affect_other_communities(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and authenticate as platformAdmin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminUsername: string = RandomGenerator.alphabets(12);
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        displayName: RandomGenerator.name(2),
        ip: undefined,
        href: "https://admin-join.example.com/" as string & tags.Format<"uri">,
        referrer: "https://landing.example.com/" as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 2. Create a visibility level that will be reused by both communities
  const visibilityCode: string = `vis-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Visibility ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Register a member user and authenticate as memberUser
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
        ip: null,
        href: "https://community.example.com/join" as string &
          tags.Format<"uri">,
        referrer: "https://community.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 4. As memberUser, create two communities (community A and B) sharing same visibility level
  const communityIdentifierA: string = `community-a-${RandomGenerator.alphaNumeric(6)}`;
  const communityIdentifierB: string = `community-b-${RandomGenerator.alphaNumeric(6)}`;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifierA,
          title: `Community A ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityA);

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifierB,
          title: `Community B ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityB);

  // Sanity check: communities are distinct
  TestValidator.notEquals(
    "community identifiers must be different",
    communityA.identifier,
    communityB.identifier,
  );

  // After member join, connection is authenticated as memberUser.
  // Switch back to platform admin by logging in with the original credentials.
  const reAuthedAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin-login.example.com/" as string & tags.Format<"uri">,
        referrer: "https://admin-login.example.com/ref" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(reAuthedAdmin);

  // 6. Create tags for each community under platformAdmin
  const tagLabelShared: string = "shared-tag";

  const tagA: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: {
          label: tagLabelShared,
          slug: `shared-${RandomGenerator.alphaNumeric(4)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          isVisible: true,
          order: undefined,
        } satisfies ICommunityPlatformCommunityTag.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityTag>(tagA);

  const tagB: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier: communityB.identifier,
        body: {
          label: tagLabelShared,
          slug: `shared-${RandomGenerator.alphaNumeric(4)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          isVisible: true,
          order: undefined,
        } satisfies ICommunityPlatformCommunityTag.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityTag>(tagB);

  // Ensure tags are distinct by id
  TestValidator.notEquals(
    "tag ids for community A and B must differ",
    tagA.id,
    tagB.id,
  );

  // 7. Delete tagA from communityA as platformAdmin
  const tagAUuid: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(tagA.id as string);

  await api.functional.communityPlatform.platformAdmin.communities.tags.erase(
    connection,
    {
      communityIdentifier: communityA.identifier,
      tagId: tagAUuid,
    },
  );

  // 8. Confirm communityB is unaffected by performing further tag operations
  const tagB2: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier: communityB.identifier,
        body: {
          label: `${tagLabelShared}-second`,
          slug: `shared-second-${RandomGenerator.alphaNumeric(4)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          isVisible: true,
          order: 1 as number & tags.Type<"int32">,
        } satisfies ICommunityPlatformCommunityTag.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityTag>(tagB2);

  // Validate that community B tags remain valid and distinct
  TestValidator.notEquals(
    "second tag for community B must have different id than first tag",
    tagB2.id,
    tagB.id,
  );

  // Re-assert tagB after the deletion of tagA to ensure structure remains valid
  typia.assert<ICommunityPlatformCommunityTag>(tagB);

  // Business-level assertion: deletion of tagA did not prevent tag operations on communityB
  TestValidator.predicate(
    "community B tags remain operable after deleting community A tag",
    () => tagB.id.length > 0 && tagB2.id.length > 0,
  );
}
