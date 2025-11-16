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

export async function test_api_community_update_by_moderator_visibility_level_change(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates two visibility levels: public and restricted
  const platformAdminJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const publicCode = "public-" + RandomGenerator.alphaNumeric(8);
  const restrictedCode = "restricted-" + RandomGenerator.alphaNumeric(8);

  const publicVisibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: publicCode,
          name: "Public",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(publicVisibilityLevel);

  const restrictedVisibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: restrictedCode,
          name: "Restricted",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(restrictedVisibilityLevel);

  // 2. Member user joins and logs in
  const memberJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAfterLogin);

  // 3. Member user creates a community with public visibility
  const communityIdentifier =
    "community-" + RandomGenerator.alphaNumeric(8).toLowerCase();
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: publicCode,
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

  // snapshot immutable / should-not-change fields
  const originalId = createdCommunity.id;
  const originalIdentifier = createdCommunity.identifier;
  const originalIdentifierNormalized = createdCommunity.identifier_normalized;
  const originalCreatorId = createdCommunity.creator.id;
  const originalCreatorUsername = createdCommunity.creator.username;
  const originalCreatedAt = createdCommunity.created_at;
  const originalUpdatedAt = createdCommunity.updated_at;

  TestValidator.equals(
    "initial visibility is public",
    createdCommunity.visibilityLevel.code,
    publicCode,
  );

  // 4. Community moderator joins and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthorizedAfterLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthorizedAfterLogin);

  // 5. Moderator updates only visibility_level_code to restricted
  const updateBody = {
    visibility_level_code: restrictedCode,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communityModerator.communities.update(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: updateBody,
      },
    );
  typia.assert(updatedCommunity);

  // 6. Assertions: visibility changed, immutable fields preserved
  TestValidator.equals(
    "visibility level should change to restricted",
    updatedCommunity.visibilityLevel.code,
    restrictedCode,
  );

  TestValidator.equals(
    "community id should remain the same",
    updatedCommunity.id,
    originalId,
  );
  TestValidator.equals(
    "community identifier should remain the same",
    updatedCommunity.identifier,
    originalIdentifier,
  );
  TestValidator.equals(
    "normalized identifier should remain the same",
    updatedCommunity.identifier_normalized,
    originalIdentifierNormalized,
  );
  TestValidator.equals(
    "creator id should remain the same",
    updatedCommunity.creator.id,
    originalCreatorId,
  );
  TestValidator.equals(
    "creator username should remain the same",
    updatedCommunity.creator.username,
    originalCreatorUsername,
  );
  TestValidator.equals(
    "created_at should remain the same",
    updatedCommunity.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be changed or at least not earlier than original",
    () => updatedCommunity.updated_at >= originalUpdatedAt,
  );

  // 7. Error scenario: invalid visibility_level_code should cause error
  const invalidUpdateBody = {
    visibility_level_code:
      "non-existent-code-" + RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityPlatformCommunity.IUpdate;

  await TestValidator.error(
    "updating with invalid visibility_level_code should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.update(
        connection,
        {
          communityIdentifier: communityIdentifier,
          body: invalidUpdateBody,
        },
      );
    },
  );
}
