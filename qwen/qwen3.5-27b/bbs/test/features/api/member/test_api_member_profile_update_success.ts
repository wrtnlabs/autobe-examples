import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully update their profile information including display name and bio.
 *
 * Test Steps:
 * 1. Register a new member account via POST /discussionBoard/auth/member/join with valid email and password
 * 2. The authorize_member_join utility function automatically authenticates and updates connection headers
 * 3. Call PUT /discussionBoard/member/profile with updated display name and bio in the request body
 * 4. Verify the response returns the updated member profile with new values
 * 5. Verify the updated_at timestamp is set to current time
 * 6. Verify other fields (id, banned, created_at, deleted_at) remain unchanged
 */
export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joined);
  // 2. Prepare profile update data with new display name and bio
  const updateBody = {
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardMember.IUpdate;
  // 3. Update member profile
  const updated = await api.functional.discussionBoard.member.profile.update(
    memberConnection,
    { body: updateBody },
  );
  typia.assert(updated);
  // 4. Validate business logic
  TestValidator.equals(
    "display name matches input",
    updated.display_name,
    updateBody.displayName,
  );
  TestValidator.equals("bio matches input", updated.bio, updateBody.bio);
  TestValidator.equals("deleted_at remains null", updated.deleted_at, null);
  TestValidator.equals("banned remains false", updated.banned, false);
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      updated.updated_at,
    ),
  );
}
