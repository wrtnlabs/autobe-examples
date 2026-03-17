import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test partial profile update where a member only updates their display name.
 * 1. Create member using authorize_member_join
 * 2. Update only username field
 * 3. Verify username changed while other fields remain unchanged
 */
export async function test_api_member_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection using join utility (sets Authorization header)
  const memberConnection: api.IConnection = { host: connection.host };
  const originalMember = await authorize_member_join(memberConnection, {});
  typia.assert(originalMember);
  // 2. Generate a new display name that's visibly different from original
  const newUsername = `updated_${originalMember.username}`;
  // 3. Update only the display name - partial update with just username field
  const updatedMember = await api.functional.redditLike.member.profile.update(
    memberConnection,
    {
      body: { username: newUsername } satisfies IRedditLikeMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // 4. Verify response contains the updated display name
  TestValidator.equals("username updated", updatedMember.username, newUsername);
  // 5. Verify other fields remain unchanged
  TestValidator.equals(
    "email unchanged",
    updatedMember.email,
    originalMember.email,
  );
  TestValidator.equals("id unchanged", updatedMember.id, originalMember.id);
  TestValidator.equals(
    "emailVerified unchanged",
    updatedMember.emailVerified,
    originalMember.emailVerified,
  );
}
