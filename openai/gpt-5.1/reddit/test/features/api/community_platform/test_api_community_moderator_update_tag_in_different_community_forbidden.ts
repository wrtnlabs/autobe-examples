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
 * Validate that a community moderator cannot update a tag that belongs to a
 * different community.
 *
 * Business intent
 *
 * - Tags are scoped per community. A tag created under Community X must not be
 *   updatable via an endpoint call whose path communityIdentifier points to a
 *   different community (Community Y), even if the tagId is known.
 * - This protects isolation of tag management between communities and ensures
 *   moderators cannot accidentally or maliciously cross-edit tags in other
 *   communities by manipulating path parameters.
 *
 * Scenario
 *
 * 1. As platformAdmin, create a visibility level (so communities can reference it
 *    via visibilityLevelCode).
 * 2. As memberUser, create two communities using that visibility level:
 *
 *    - Community X (identifierX)
 *    - Community Y (identifierY)
 * 3. As communityModerator, create a tag in Community X via the moderator
 *    tags.create endpoint -> TagX.
 * 4. Attempt to update TagX using communityIdentifier = identifierY with the same
 *    tagId (TagX.id). The body will propose distinct new values so we can
 *    easily detect if a change was wrongly applied.
 * 5. The invalid cross-community update must fail (error) from the tags.update
 *    endpoint.
 * 6. As a control, perform a valid update using communityIdentifier = identifierX
 *    and TagX.id, and verify that the valid update succeeds and TagX’s state
 *    reflects the new values.
 *
 * Implementation details
 *
 * - Authentication and role switching
 *
 *   - Use the provided auth.* join/login endpoints, relying on the SDK’s automatic
 *       token handling via connection.headers.
 *   - Sequence: a) platformAdmin.join to be able to create visibility levels. b)
 *       communityVisibilityLevels.create as platformAdmin. c) memberUser.join;
 *       afterwards memberUser acts as the creator for both communities. d)
 *       communityModerator.join; this actor will be used for tag operations.
 * - Community creation
 *
 *   - Use memberUser.auth context and
 *       communityPlatform.memberUser.communities.create.
 *   - Pass a shared visibilityLevelCode referencing the created visibility level;
 *       use different identifier values for the two communities.
 * - Tag creation (Community X)
 *
 *   - Switch to communityModerator context with auth.communityModerator.login (or
 *       rely on join’s automatic login behavior if that’s already sufficient).
 *   - Call communityPlatform.communityModerator.communities.tags.create with
 *       communityIdentifier = identifierX, body satisfies
 *       ICommunityPlatformCommunityTag.ICreate.
 * - Cross-community forbidden update
 *
 *   - Prepare a body with clearly different properties (label, slug, description,
 *       isVisible, order) from the original TagX.
 *   - Use TestValidator.error with an async callback that calls
 *       tags.update(connection, { communityIdentifier: identifierY, tagId:
 *       tagX.id, body: ... } satisfies
 *       ICommunityPlatformCommunityTag.IUpdate).
 *   - We do NOT check specific HTTP status codes; only that an error is thrown.
 * - Valid same-community update
 *
 *   - After the error assertion, perform a legitimate update using
 *       communityIdentifier = identifierX, same tagId, and another set of
 *       update data to prove that updates are allowed when the community scope
 *       matches.
 *   - Assert response type with typia.assert and validate that the returned tag
 *       reflects the update.
 *
 * Testing strategy
 *
 * - Positive path: demonstrate that a moderator can update a tag when
 *   communityIdentifier and tagId match correctly.
 * - Negative path: demonstrate that using a different communityIdentifier for the
 *   same tagId is forbidden and does not silently mutate the tag.
 */
export async function test_api_community_moderator_update_tag_in_different_community_forbidden(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 2. Member user joins and creates two communities (X and Y)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityIdentifierX = `community-x-${RandomGenerator.alphaNumeric(6)}`;
  const communityIdentifierY = `community-y-${RandomGenerator.alphaNumeric(6)}`;

  const communityXBody = {
    identifier: communityIdentifierX,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityX: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityXBody,
      },
    );
  typia.assert(communityX);

  const communityYBody = {
    identifier: communityIdentifierY,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityY: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityYBody,
      },
    );
  typia.assert(communityY);

  TestValidator.notEquals(
    "communities must have different identifiers",
    communityX.identifier,
    communityY.identifier,
  );

  // 3. Community moderator joins
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. Create TagX in Community X as moderator
  const tagCreateBody = {
    label: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;
  const tagX: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: communityX.identifier,
        body: tagCreateBody,
      },
    );
  typia.assert(tagX);

  // Snapshot original state for later comparison
  const originalTagX = tagX;

  // 5. Attempt forbidden cross-community update: use Community Y with TagX.id
  const forbiddenUpdateBody = {
    label: `${tagX.label}-forbidden-update`,
    slug: `${tagX.slug}-forbidden-update`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    isVisible: !tagX.isVisible,
    order: (tagX.order ?? 0) + 10,
  } satisfies ICommunityPlatformCommunityTag.IUpdate;

  await TestValidator.error(
    "moderator must not update tag when communityIdentifier refers to different community",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.tags.update(
        connection,
        {
          communityIdentifier: communityY.identifier,
          tagId: tagX.id,
          body: forbiddenUpdateBody,
        },
      );
    },
  );

  // 6. Perform a valid update on Community X to show updates still work
  const validUpdateBody = {
    label: `${originalTagX.label}-updated`,
    slug: `${originalTagX.slug}-updated`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    isVisible: originalTagX.isVisible,
    order: (originalTagX.order ?? 0) + 1,
  } satisfies ICommunityPlatformCommunityTag.IUpdate;

  const updatedTagX: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.update(
      connection,
      {
        communityIdentifier: communityX.identifier,
        tagId: originalTagX.id,
        body: validUpdateBody,
      },
    );
  typia.assert(updatedTagX);

  // Ensure the valid update actually changed the tag
  TestValidator.notEquals(
    "valid same-community update must change tag label",
    updatedTagX.label,
    originalTagX.label,
  );
  TestValidator.notEquals(
    "valid same-community update must change tag slug",
    updatedTagX.slug,
    originalTagX.slug,
  );
}
