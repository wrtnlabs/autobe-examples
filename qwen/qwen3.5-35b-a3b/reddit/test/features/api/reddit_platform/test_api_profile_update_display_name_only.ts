import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authResponse);
  // Step 2: Store initial profile data from authentication response
  const originalUsername = authResponse.username;
  const originalEmail = authResponse.email;
  const originalKarma = authResponse.karma;
  const originalCreatedAt = authResponse.created_at;
  const originalUpdatedAt = authResponse.updated_at;
  const originalDeletedAt = authResponse.deleted_at;
  // Step 3: Perform partial profile update with only display_name
  // Note: While display_name is sent in the request, it's not returned in the
  // IRedditPlatformMember response type (it's from a separate Profile entity).
  // This test validates that the API accepts partial updates without affecting
  // other member fields that ARE returned.
  const updatedProfile = await api.functional.redditPlatform.member.profile.put(
    memberConnection,
    {
      body: {
        display_name: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // Step 4: Validate that the partial update preserved all existing fields
  // Verify immutable fields remain unchanged
  TestValidator.equals(
    "username unchanged (immutable)",
    updatedProfile.username,
    originalUsername,
  );
  TestValidator.equals("karma unchanged", updatedProfile.karma, originalKarma);
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedProfile.deleted_at,
    originalDeletedAt,
  );
  // Verify updated_at timestamp reflects the modification
  TestValidator.notEquals(
    "updated_at reflects modification",
    originalUpdatedAt,
    updatedProfile.updated_at,
  );
}