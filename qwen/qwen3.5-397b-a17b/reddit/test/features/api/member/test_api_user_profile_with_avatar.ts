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

export async function test_api_user_profile_with_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as target user who will upload avatar
  const targetUsername = RandomGenerator.name(1);
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: targetUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(targetAuth);
  // 2. Upload avatar image for target user (authenticated from previous join)
  const avatar = await generate_random_reddit_community_member_avatars_create(
    targetConnection,
    {},
  );
  typia.assert(avatar);
  // 3. Create and authenticate as viewing member to fetch target's profile
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerAuth = await authorize_member_join(viewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(viewerAuth);
  // 4. Call GET /redditCommunity/member/members/{memberId}/profile with target user's ID
  const profile =
    await api.functional.redditCommunity.member.members.profile.at(
      viewerConnection,
      {
        memberId: targetAuth.id,
      },
    );
  typia.assert(profile);
  // 5. Validate response contains avatar with all required fields
  TestValidator.predicate(
    "avatar exists",
    profile.avatar !== null && profile.avatar !== undefined,
  );
  const safeAvatar = profile.avatar!;
  TestValidator.equals("avatar id matches", safeAvatar.id, avatar.id);
  TestValidator.equals(
    "avatar file_name matches",
    safeAvatar.file_name,
    avatar.file_name,
  );
  TestValidator.equals(
    "avatar file_size matches",
    safeAvatar.file_size,
    avatar.file_size,
  );
  TestValidator.equals(
    "avatar mime_type matches",
    safeAvatar.mime_type,
    avatar.mime_type,
  );
  TestValidator.equals(
    "avatar storage_path matches",
    safeAvatar.storage_path,
    avatar.storage_path,
  );
  TestValidator.predicate(
    "avatar file_size is positive",
    safeAvatar.file_size > 0,
  );
  TestValidator.predicate(
    "avatar mime_type is image",
    safeAvatar.mime_type.startsWith("image/"),
  );
  TestValidator.predicate(
    "avatar created_at is valid",
    safeAvatar.created_at !== null,
  );
  TestValidator.predicate(
    "avatar updated_at is valid",
    safeAvatar.updated_at !== null,
  );
  // Validate avatar profile reference
  TestValidator.predicate(
    "avatar profile exists",
    safeAvatar.profile !== null && safeAvatar.profile !== undefined,
  );
  TestValidator.equals(
    "avatar profile id matches target",
    safeAvatar.profile.id,
    profile.id,
  );
  // Validate profile member info
  TestValidator.equals(
    "profile member id matches target",
    profile.member.id,
    targetAuth.id,
  );
  TestValidator.equals(
    "profile member username matches",
    profile.member.username,
    targetUsername,
  );
}
