import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate creation of a community using only required fields.
 *
 * Business goal:
 *
 * - Ensure that /communityPlatform/memberUser/communities successfully creates a
 *   community when only the required fields are provided in
 *   ICommunityPlatformCommunity.ICreate and optional fields are omitted.
 * - Ensure that system-managed fields and associations are populated and that
 *   omitted optional fields are represented as null/undefined according to the
 *   read DTO.
 *
 * Steps:
 *
 * 1. Register a platform admin and let the SDK attach the admin token.
 * 2. As platform admin, create a community visibility level (e.g. code "public").
 * 3. Register a member user (join) so that the SDK switches context to memberUser.
 * 4. Optionally re-login as member user to simulate explicit login flow.
 * 5. As member user, call communities.create with only identifier, title,
 *    visibilityLevelCode and isNsfw in the body. Omit description and
 *    primaryTagIds.
 * 6. Assert that:
 *
 *    - The response has a valid UUID id and timestamps created_at/updated_at.
 *    - Description and rules_summary are null/undefined (not populated).
 *    - Is_archived and is_removed are false for a freshly created community.
 *    - Creator.id matches the authenticated member user id.
 *    - VisibilityLevel.code matches the visibility level code created by
 *         platformAdmin.
 */
export async function test_api_community_creation_with_required_fields_only(
  connection: api.IConnection,
) {
  // 1. Register platform admin (SDK will attach Authorization token)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a community visibility level master record as platform admin
  const visibilityCode = "public";
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community accessible to everyone.",
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
    "visibility level code should match requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user (join) so that SDK sets memberUser token
  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberUserEmail,
    password: "MemberPass123!",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Optionally re-login as member user to simulate explicit login
  const memberLoginBody = {
    identifier: memberUserEmail,
    password: "MemberPass123!",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedByLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedByLogin);

  TestValidator.equals(
    "member login should return same user id as join",
    memberAuthorizedByLogin.id,
    memberAuthorized.id,
  );

  // 5. Create a community with only required fields from memberUser context
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityTitle = RandomGenerator.name(3);

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // 6. Assertions about created community
  TestValidator.equals(
    "community identifier should match input",
    createdCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community title should match input",
    createdCommunity.title,
    communityTitle,
  );

  // description is optional; when omitted, it should be null or undefined
  TestValidator.predicate(
    "description should be null or undefined when omitted on create",
    createdCommunity.description === null ||
      createdCommunity.description === undefined,
  );

  // rules_summary is optional and not part of create; should be null/undefined
  TestValidator.predicate(
    "rules_summary should be null or undefined on fresh community",
    createdCommunity.rules_summary === null ||
      createdCommunity.rules_summary === undefined,
  );

  // Fresh communities should not be archived or removed
  TestValidator.equals(
    "is_archived should be false on creation",
    createdCommunity.is_archived,
    false,
  );
  TestValidator.equals(
    "is_removed should be false on creation",
    createdCommunity.is_removed,
    false,
  );

  // Creator association should match authenticated member user
  TestValidator.equals(
    "creator.id should match member user id",
    createdCommunity.creator.id,
    memberAuthorizedByLogin.id,
  );

  // Visibility level association should match created visibility level code
  TestValidator.equals(
    "visibilityLevel.code should match created visibility level code",
    createdCommunity.visibilityLevel.code,
    visibilityCode,
  );

  // Basic sanity checks for timestamps (typia.assert already validated format)
  TestValidator.predicate(
    "created_at should be earlier than or equal to updated_at",
    new Date(createdCommunity.created_at).getTime() <=
      new Date(createdCommunity.updated_at).getTime(),
  );
}
