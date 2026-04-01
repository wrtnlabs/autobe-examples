import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_avatars_create } from "../../../generate/generate_random_reddit_community_member_avatars_create";
import { prepare_random_reddit_community_user_avatar } from "../../../prepare/prepare_random_reddit_community_user_avatar";

export async function test_api_member_profile_with_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Upload an avatar image
  const avatar = await generate_random_reddit_community_member_avatars_create(
    memberConnection,
    {},
  );
  typia.assert(avatar);
  // 4. Retrieve the member's profile
  const profile =
    await api.functional.redditCommunity.member.profile.at(memberConnection);
  typia.assert(profile);
  // 5. Validate avatar is not null and contains all required metadata
  TestValidator.predicate("avatar should exist", profile.avatar !== null);
  TestValidator.predicate(
    "avatar should be defined",
    profile.avatar !== undefined,
  );
  // Use typia.assertGuard to narrow the nullable type for cleaner access
  typia.assertGuard(profile.avatar!);
  // Validate avatar metadata matches the uploaded avatar
  TestValidator.equals("avatar ID matches", avatar.id, profile.avatar.id);
  TestValidator.equals(
    "avatar file name exists",
    typeof profile.avatar.file_name,
    "string",
  );
  TestValidator.predicate(
    "avatar file size is positive",
    profile.avatar.file_size > 0,
  );
  TestValidator.equals(
    "avatar MIME type exists",
    typeof profile.avatar.mime_type,
    "string",
  );
  TestValidator.predicate(
    "avatar storage path is valid URI",
    profile.avatar.storage_path.startsWith("http://") ||
      profile.avatar.storage_path.startsWith("https://"),
  );
  TestValidator.predicate(
    "avatar created_at is valid date-time",
    !isNaN(Date.parse(profile.avatar.created_at)),
  );
  TestValidator.predicate(
    "avatar updated_at is valid date-time",
    !isNaN(Date.parse(profile.avatar.updated_at)),
  );
  // Validate avatar profile reference matches the user's profile
  TestValidator.equals(
    "avatar profile ID matches user profile",
    profile.avatar.profile.id,
    profile.id,
  );
}
