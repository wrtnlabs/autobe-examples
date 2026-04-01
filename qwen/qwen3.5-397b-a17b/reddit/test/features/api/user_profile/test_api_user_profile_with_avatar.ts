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
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Upload avatar image using utility function
  const avatar = await generate_random_reddit_community_member_avatars_create(
    memberConnection,
    {},
  );
  typia.assert(avatar);
  // 3. Retrieve user profile using the member's profile ID
  const profile = await api.functional.redditCommunity.profiles.at(
    memberConnection,
    {
      profileId: authResult.id,
    },
  );
  typia.assert(profile);
  // 4. Verify avatar field is populated (not null)
  TestValidator.predicate(
    "avatar should be populated",
    () => profile.avatar !== null && profile.avatar !== undefined,
  );
  // 5. Verify the avatar in profile matches the uploaded avatar (most recently uploaded)
  if (profile.avatar) {
    TestValidator.equals(
      "avatar id matches uploaded",
      profile.avatar.id,
      avatar.id,
    );
    TestValidator.equals(
      "avatar file_name matches",
      profile.avatar.file_name,
      avatar.file_name,
    );
    TestValidator.equals(
      "avatar mime_type matches",
      profile.avatar.mime_type,
      avatar.mime_type,
    );
  }
  // 6. Verify other profile fields are correctly returned
  TestValidator.predicate(
    "profile has display_name",
    () => profile.display_name.length > 0,
  );
  TestValidator.predicate("profile karma_score is integer", () =>
    Number.isInteger(profile.karma_score),
  );
  TestValidator.equals(
    "profile member id matches auth",
    profile.member.id,
    authResult.id,
  );
  TestValidator.equals(
    "profile member username matches",
    profile.member.username,
    authResult.id ? authResult.id : authResult.id,
  );
}
