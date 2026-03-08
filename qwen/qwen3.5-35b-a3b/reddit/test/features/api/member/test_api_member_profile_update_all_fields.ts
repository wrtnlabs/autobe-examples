import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Store original creation timestamp for validation
  const createdAt = memberAuth.createdAt;
  // 3. Create authenticated connection with token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 4. Update all profile fields
  const updateBody = {
    display_name: "Test User Display",
    bio: "This is a test biography",
    avatar_url: "https://example.com/avatar.png",
  } satisfies IRedditPlatformMember.IUpdate;
  const updatedMember =
    await api.functional.redditPlatform.member.profile.update(
      memberConnection,
      { body: updateBody },
    );
  typia.assert(updatedMember);
  // 5. Validate updated profile fields
  TestValidator.equals(
    "display name updated",
    updatedMember.displayName,
    updateBody.display_name,
  );
  TestValidator.equals("bio updated", updatedMember.bio, updateBody.bio);
  TestValidator.equals(
    "avatar URL updated",
    updatedMember.avatarUrl,
    updateBody.avatar_url,
  );
  TestValidator.predicate(
    "account remains active",
    updatedMember.isActive === true,
  );
  // 6. Validate timestamp was updated
  TestValidator.notEquals(
    "updated_at changed from created_at",
    createdAt,
    updatedMember.updatedAt,
  );
  typia.assert(updatedMember.updatedAt);
}
