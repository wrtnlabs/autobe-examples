import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a member who has not set optional profile fields (bio and avatar).
 *
 * Validates that the member retrieval endpoint correctly returns null values for optional profile fields when they have not been set. This ensures the API properly handles nullable fields and returns a valid member object even when bio and avatar are not configured.
 *
 * Special attention is given to verifying that required fields are present while optional fields (bio, avatar) are correctly returned as null, and that the display_name has a default value and karma is initialized to 0.
 *
 * 1. Create a new member account via POST /redditClone/auth/member/join using authorize_member_join utility
 * 2. Retrieve the member via GET /redditClone/members/{memberId}
 * 3. Verify the response contains all required fields with typia.assert
 * 4. Verify bio field is null (not set)
 * 5. Verify avatar field is null (not set)
 * 6. Verify display_name has a default value
 * 7. Verify karma is 0 (no votes yet)
 */
export async function test_api_member_retrieve_with_null_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account without profile updates
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Retrieve the member via GET /redditClone/members/{memberId}
  const retrieved = await api.functional.redditClone.members.at(
    memberConnection,
    {
      memberId: member.id,
    },
  );
  typia.assert(retrieved);
  // 3. Verify bio field is null (not set)
  TestValidator.equals("bio is null", retrieved.bio, null);
  // 4. Verify avatar field is null (not set)
  TestValidator.equals("avatar is null", retrieved.avatar, null);
  // 5. Verify display_name has a default value (not empty)
  TestValidator.predicate(
    "display_name is not empty",
    retrieved.display_name.length > 0,
  );
  // 6. Verify karma is 0 (no votes yet)
  TestValidator.equals("karma is 0", retrieved.karma, 0);
  // 7. Verify required fields are present
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(retrieved.id),
  );
  TestValidator.predicate("email is valid", retrieved.email.length > 0);
  TestValidator.predicate("username is valid", retrieved.username.length > 0);
  TestValidator.predicate(
    "created_at is valid",
    retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrieved.updated_at.length > 0,
  );
}
