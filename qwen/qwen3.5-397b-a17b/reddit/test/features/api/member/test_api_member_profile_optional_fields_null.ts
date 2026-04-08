import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test profile retrieval when optional fields (bio, avatar_url) are not set.
 *
 * Validates the complete member profile retrieval flow including member registration with default profile values and fetching the public profile. Ensures that optional profile fields (bio, avatar_url) are correctly returned as null when not set, while all required fields (id, username, display_name, karma, timestamps) are present and valid.
 *
 * Special attention is given to verifying that the system correctly distinguishes between unset optional fields (null values) and required fields (always present with valid values). This confirms proper nullable field handling in the profile response structure.
 *
 * 1. Create new member account using authorize_member_join utility with randomized credentials. The member is created with default profile values where bio and avatar_url are not set (null).
 * 2. Fetch the member's public profile using GET /redditCommunity/members/{username} endpoint.
 * 3. Validate the profile response: required fields present (id, username, display_name, karma, timestamps), optional fields are null (bio, avatar_url).
 * 4. Verify username matches the registered username and all timestamps are valid ISO 8601 format.
 */
export async function test_api_member_profile_optional_fields_null(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with default profile (no bio/avatar set)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Fetch the member's public profile by username
  const profile = await api.functional.redditCommunity.members.getByUsername(
    memberConnection,
    {
      username: authorized.username,
    },
  );
  typia.assert(profile);
  // 3. Validate business logic: username matches registered username
  TestValidator.equals(
    "username matches registered",
    profile.username,
    authorized.username,
  );
  // 4. Validate optional fields are null (not set by default)
  TestValidator.equals("bio is null", profile.bio, null);
  TestValidator.equals("avatar_url is null", profile.avatar_url, null);
  // 5. Validate deleted_at is null (active account)
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
