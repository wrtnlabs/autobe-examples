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
 * Verify role-based access control for deleting community tags.
 *
 * Business purpose: Ensure that the DELETE community tag endpoint under the
 * communityModerator actor only allows authorized moderator-role callers to
 * remove tags, while unauthenticated or regular memberUser actors are rejected.
 * This protects community taxonomy configuration from being altered by
 * unauthorized users.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a platformAdmin.
 * 2. As platformAdmin, create a community visibility level that can be used when
 *    creating a community (e.g., a `public`-like level).
 * 3. Register and authenticate a memberUser.
 * 4. As memberUser, create a community referencing the created visibility level by
 *    its business code.
 * 5. Register and authenticate a communityModerator.
 * 6. As communityModerator, create a tag for the community using the
 *    communities/{communityIdentifier}/tags create endpoint.
 * 7. Using an unauthenticated connection (no Authorization header), attempt to
 *    delete the tag via the communityModerator DELETE endpoint and expect an
 *    error.
 * 8. Switch authentication to memberUser via auth.memberUser.login and attempt to
 *    delete the same tag; expect an error because member users are not
 *    authorized to delete tags via this route.
 * 9. Switch authentication to communityModerator via auth.communityModerator.login
 *    and perform a valid delete call; expect success (no error).
 * 10. Optionally, attempt a second delete as moderator and expect an error,
 *     demonstrating that the association is gone.
 *
 * Validation approach:
 *
 * - Use typia.assert on all non-void API results to ensure structural
 *   correctness.
 * - Use TestValidator.error with async callbacks for the unauthorized delete
 *   attempts (unauthenticated and memberUser contexts).
 * - Do not assert on specific HTTP status codes; only distinguish success vs
 *   error.
 */
export async function test_api_community_tag_delete_access_control_between_roles(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin.
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminPassword = RandomGenerator.alphaNumeric(16);

  const platformAdminJoinOutput: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoinOutput);

  // 2. As platformAdmin, create a community visibility level.
  const visibilityCreateBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);

  // 3. Register and authenticate a memberUser.
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);

  const memberJoinOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberEmail,
        password: memberPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoinOutput);

  // 4. As memberUser, create a community using the visibility level code.
  const communityCreateBody = {
    identifier: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibility.code,
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

  const communityIdentifier = community.identifier;

  // 5. Register and authenticate a communityModerator.
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);

  const moderatorJoinOutput: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: null,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoinOutput);

  // 6. As communityModerator, create a tag for the community.
  const tagCreateBody = {
    label: RandomGenerator.paragraph({ sentences: 2 }),
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isVisible: true,
    order: undefined,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier,
        body: tagCreateBody,
      },
    );
  typia.assert(tag);

  const tagId = tag.id;

  // 7. Attempt to delete the tag without Authorization header (unauthenticated).
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated delete must fail", async () => {
    await api.functional.communityPlatform.communityModerator.communities.tags.erase(
      unauthenticatedConnection,
      {
        communityIdentifier,
        tagId: tagId as string & tags.Format<"uuid">,
      },
    );
  });

  // 8. Switch to memberUser auth and attempt delete (should fail).
  const memberLoginOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: memberPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLoginOutput);

  await TestValidator.error("memberUser delete must fail", async () => {
    await api.functional.communityPlatform.communityModerator.communities.tags.erase(
      connection,
      {
        communityIdentifier,
        tagId: tagId as string & tags.Format<"uuid">,
      },
    );
  });

  // 9. Switch to communityModerator auth and perform successful delete.
  const moderatorLoginOutput: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorLoginOutput);

  await api.functional.communityPlatform.communityModerator.communities.tags.erase(
    connection,
    {
      communityIdentifier,
      tagId: tagId as string & tags.Format<"uuid">,
    },
  );

  // 10. Optional: subsequent delete as moderator should fail (tag already removed).
  await TestValidator.error(
    "second delete after removal must fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.tags.erase(
        connection,
        {
          communityIdentifier,
          tagId: tagId as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
