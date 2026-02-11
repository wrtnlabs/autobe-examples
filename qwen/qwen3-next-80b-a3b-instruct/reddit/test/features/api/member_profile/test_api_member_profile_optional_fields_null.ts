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

export async function test_api_member_profile_optional_fields_null(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create an updated connection using the access token from join response
  const profileConnection: api.IConnection = { host: connection.host };
  profileConnection.headers = {
    authorization: `Bearer ${joinResponse.token.access}`,
  };
  // 3. Retrieve profile and validate bio and avatar_url are explicitly null (default state)
  const retrievedProfile =
    await api.functional.redditCommunity.member.profile.at(profileConnection);
  typia.assert(retrievedProfile);
  // Validate bio and avatar_url are explicitly null (default state)
  TestValidator.equals("bio is null", retrievedProfile.bio, null);
  TestValidator.equals("avatar_url is null", retrievedProfile.avatar_url, null);
}
