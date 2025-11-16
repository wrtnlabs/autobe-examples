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

/**
 * Validate community metadata update by community moderator.
 *
 * Business goal: Ensure that a community moderator can update basic community
 * metadata (title, description, rules_summary) of an existing community using
 * the moderator-facing update endpoint, without altering immutable identity
 * fields such as id, identifier, creator, and created_at.
 *
 * High-level flow:
 *
 * 1. As a platform admin, create a visibility level so that communities can
 *    reference it during creation.
 * 2. As a member user, self-register and create a community using the newly
 *    created visibility level.
 * 3. As a community moderator, self-register (and implicitly authenticate) so that
 *    moderator-level operations can be executed.
 * 4. As that moderator, call the community update endpoint with an
 *    ICommunityPlatformCommunity.IUpdate payload that changes title and
 *    description and sets rules_summary.
 * 5. Assert that the update response reflects the new metadata fields and that
 *    immutable identity fields have not changed.
 *
 * Notes and constraints:
 *
 * - Only the following APIs are available and must be used:
 *
 *   - Api.functional.auth.memberUser.join / login
 *   - Api.functional.auth.communityModerator.join / login
 *   - Api.functional.auth.platformAdmin.join / login
 *   - Api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create
 *   - Api.functional.communityPlatform.memberUser.communities.create
 *   - Api.functional.communityPlatform.communityModerator.communities.update
 * - There is no dedicated GET endpoint for communities in the provided SDK;
 *   therefore, the test validates state using only the update response object.
 * - The memberUser and communityModerator authentication flows automatically
 *   update the connection headers via the SDK, so the test must not manipulate
 *   connection.headers directly.
 */
export async function test_api_community_update_by_moderator_basic_metadata(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as platform admin, then create a
  //    visibility level for communities.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
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

  // visibility level payload: use a deterministic code so we can reference it
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert(visibilityLevel);

  // 2. Register as member user and create a community using visibility level.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const initialIdentifier = `community-${RandomGenerator.alphaNumeric(10)}`;
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 6 });

  const communityCreateBody = {
    identifier: initialIdentifier,
    title: initialTitle,
    description: initialDescription,
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // 3. Register as a community moderator (join also authenticates).
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. As community moderator, update community metadata.
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const rulesSummary = RandomGenerator.paragraph({ sentences: 3 });

  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    rules_summary: rulesSummary,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communityModerator.communities.update(
      connection,
      {
        communityIdentifier: createdCommunity.identifier,
        body: updateBody,
      },
    );
  typia.assert(updatedCommunity);

  // 5. Validate identity invariants and metadata changes.
  TestValidator.equals(
    "community id remains unchanged after moderator update",
    updatedCommunity.id,
    createdCommunity.id,
  );

  TestValidator.equals(
    "community identifier remains unchanged after moderator update",
    updatedCommunity.identifier,
    createdCommunity.identifier,
  );

  TestValidator.equals(
    "creator remains unchanged after moderator update",
    updatedCommunity.creator.id,
    createdCommunity.creator.id,
  );

  TestValidator.equals(
    "created_at remains unchanged after moderator update",
    updatedCommunity.created_at,
    createdCommunity.created_at,
  );

  TestValidator.equals(
    "updated title is reflected in response",
    updatedCommunity.title,
    updatedTitle,
  );

  TestValidator.equals(
    "updated description is reflected in response",
    updatedCommunity.description,
    updatedDescription,
  );

  TestValidator.equals(
    "updated rules_summary is reflected in response",
    updatedCommunity.rules_summary,
    rulesSummary,
  );
}
