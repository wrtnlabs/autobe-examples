import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_community_creation_rejects_unknown_visibility_code(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authenticated connection (token is set by SDK)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional; omit it so that server can infer or ignore
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. (Optional sanity) Create a community with a plausible, valid visibility level code
  const validIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const validCreateBody = {
    identifier: validIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    // Use a generic, likely-valid code; actual validity is governed by master data
    visibilityLevelCode: "public",
    isNsfw: false,
    // No tags for simplicity
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: validCreateBody,
      },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community identifier should match input identifier",
    createdCommunity.identifier,
    validIdentifier,
  );

  // 3. Attempt to create a community with a non-existent visibility level code
  const invalidIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const invalidCreateBody = {
    identifier: invalidIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "nonexistent_visibility",
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  // 4. Expect the API call to fail when using an unknown visibilityLevelCode
  await TestValidator.error(
    "community creation should fail for unknown visibilityLevelCode",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        {
          body: invalidCreateBody,
        },
      );
    },
  );
}
