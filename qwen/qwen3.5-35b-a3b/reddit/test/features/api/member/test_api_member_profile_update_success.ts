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

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with unique credentials and get authentication tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(5) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create member connection using access token from join response
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResponse.token.access,
    },
  };
  // 3. Prepare profile update data
  const display_name = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const avatar_url = typia.random<string & tags.Format<"uri">>();
  // 4. Update member profile with all three fields
  const updatedProfileRaw = await api.functional.redditPlatform.member.profile.patch(
    memberConnection,
    {
      body: {
        display_name,
        bio,
        avatar_url,
      } satisfies IRedditPlatformMember.IUpdate,
    },
  );
  typia.assert(updatedProfileRaw);
  const updatedProfile = updatedProfileRaw as IRedditPlatformMember & {
    email: string;
    display_name: string;
    bio: string;
    avatar_url: string & tags.Format<"uri">;
  };
  // 5. Validate response contains all required member fields
  TestValidator.equals("member id matches", updatedProfile.id, joinResponse.id);
  TestValidator.equals(
    "username unchanged after profile update",
    updatedProfile.username,
    joinResponse.username,
  );
  TestValidator.equals(
    "email matches join response",
    updatedProfile.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "karma matches join response",
    updatedProfile.karma,
    joinResponse.karma,
  );
  TestValidator.equals(
    "created_at unchanged after profile update",
    updatedProfile.created_at,
    joinResponse.created_at,
  );
  // 6. Validate profile-specific fields are correctly updated
  TestValidator.equals(
    "display_name updated to expected value",
    updatedProfile.display_name,
    display_name,
  );
  TestValidator.equals(
    "bio updated to expected value",
    updatedProfile.bio,
    bio,
  );
  TestValidator.equals(
    "avatar_url updated to expected value",
    updatedProfile.avatar_url,
    avatar_url,
  );
  // 7. Validate updated_at timestamp reflects the current time (within 10 seconds)
  const updatedAt = new Date(updatedProfile.updated_at);
  const now = new Date();
  const timeDifference = Math.abs(now.getTime() - updatedAt.getTime());
  TestValidator.predicate(
    "updated_at timestamp is recent",
    timeDifference < 10000,
  );
  // 8. Verify soft deletion is null (active account)
  TestValidator.equals(
    "account is active (not deleted)",
    updatedProfile.deleted_at,
    null,
  );
}