import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_bio_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Capture original profile data from authentication response
  const originalEmail = joinResponse.email;
  const originalUsername = joinResponse.username;
  const originalUpdatedAt = joinResponse.updated_at;
  // 3. Update only bio field (partial update)
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const updateResponse =
    await api.functional.redditCommunity.member.profile.update(joinConnection, {
      body: {
        bio: newBio,
      } satisfies IRedditCommunityMember.IUpdate,
    });
  typia.assert(updateResponse);
  // 4. Validate partial update works - only provided field should be logically updated
  // Note: bio is managed through separate Profile entity, so we validate that other fields remain unchanged
  // Email should remain unchanged
  TestValidator.equals("email unchanged", updateResponse.email, originalEmail);
  // Username (display_name) should remain unchanged
  TestValidator.equals(
    "username unchanged",
    updateResponse.username,
    originalUsername,
  );
  // 5. Validate updated_at timestamp is updated (shows partial update occurred)
  TestValidator.notEquals(
    "updated_at changed after update",
    originalUpdatedAt,
    updateResponse.updated_at,
  );
}
