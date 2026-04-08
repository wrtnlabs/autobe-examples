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

export async function test_api_profile_update_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via join
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(4) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create profile update request with all three fields
  const newDisplayName = RandomGenerator.name(3);
  const newBio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const newAvatarUrl = typia.random<string & tags.Format<"uri">>();
  const updateBody = {
    display_name: newDisplayName,
    bio: newBio,
    avatar_url: newAvatarUrl,
  } satisfies IRedditPlatformMember.IUpdate;
  // 3. Create new connection for authenticated requests
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // 4. Update profile
  const updatedProfile = await api.functional.redditPlatform.member.profile.put(
    authenticatedConnection,
    { body: updateBody },
  );
  typia.assert(updatedProfile);
  // 5. Validate response - core member fields unchanged
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    joinResponse.username,
  );
  TestValidator.equals(
    "karma unchanged",
    updatedProfile.karma,
    joinResponse.karma,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    joinResponse.created_at,
  );
  // 6. Validate updated_at changed after profile update
  TestValidator.notEquals(
    "updated_at changed after profile update",
    joinResponse.updated_at,
    updatedProfile.updated_at,
  );
  // 7. Validate account is active (deleted_at is null)
  TestValidator.equals("account active", updatedProfile.deleted_at, null);
}
