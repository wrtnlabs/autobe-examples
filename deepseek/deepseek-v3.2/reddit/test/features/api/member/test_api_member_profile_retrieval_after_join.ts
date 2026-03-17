import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_retrieval_after_join(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member using utility function
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const authorizedMember = await authorize_member_join(connection, {
    body: joinData,
  });
  typia.assert(authorizedMember);
  // Step 2: Create member-specific connection with authentication token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: authorizedMember.token.access,
  };
  // Step 3: Retrieve member profile
  const profile =
    await api.functional.communityPlatform.member.profile.at(memberConnection);
  typia.assert(profile);
  // Step 4: Validate all expected fields are present and have correct values
  TestValidator.predicate(
    "id should be UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  TestValidator.equals(
    "username should match registration",
    profile.username,
    joinData.username,
  );
  // Handle nickname comparison (nickname can be null or undefined in joinData)
  TestValidator.predicate(
    "nickname should match registration or be null",
    () => {
      if (joinData.nickname === undefined || joinData.nickname === null) {
        return profile.nickname === null;
      }
      return profile.nickname === joinData.nickname;
    },
  );
  TestValidator.equals(
    "avatar should be null for new user",
    profile.avatar,
    null,
  );
  TestValidator.equals("karma should be 0 for new user", profile.karma, 0);
  TestValidator.equals(
    "posts array should be empty for new user",
    profile.posts.length,
    0,
  );
  TestValidator.equals(
    "comments array should be empty for new user",
    profile.comments.length,
    0,
  );
  TestValidator.equals(
    "email should match registration",
    profile.email,
    joinData.email,
  );
  TestValidator.equals(
    "email_verified should be false initially",
    profile.email_verified,
    false,
  );
  TestValidator.predicate(
    "registered_at should be valid ISO date string",
    () => {
      const date = new Date(profile.registered_at);
      return !isNaN(date.getTime()) && profile.registered_at.includes("T");
    },
  );
  TestValidator.equals(
    "last_login_at should be null initially",
    profile.last_login_at,
    null,
  );
  TestValidator.predicate("created_at should be valid ISO date string", () => {
    const date = new Date(profile.created_at);
    return !isNaN(date.getTime()) && profile.created_at.includes("T");
  });
  TestValidator.predicate("updated_at should be valid ISO date string", () => {
    const date = new Date(profile.updated_at);
    return !isNaN(date.getTime()) && profile.updated_at.includes("T");
  });
  TestValidator.predicate(
    "created_at and updated_at should be recent timestamps",
    () => {
      const created = new Date(profile.created_at).getTime();
      const now = Date.now();
      return Math.abs(now - created) < 24 * 60 * 60 * 1000; // within 24 hours
    },
  );
  // Validate member ID matches between join response and profile response
  TestValidator.equals(
    "member ID should match between join and profile",
    profile.id,
    authorizedMember.id,
  );
}
