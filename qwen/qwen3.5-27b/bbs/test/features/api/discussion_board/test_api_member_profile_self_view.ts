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
 * Test that an authenticated member can retrieve their own profile information.
 * 1. Register a new member account
 * 2. Fetch the member's own profile using their ID
 * 3. Validate all profile fields including display_name, bio, banned status, and timestamps
 */
export async function test_api_member_profile_self_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(authorized);
  // 2. Fetch the member's own profile
  const profile: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.at(memberConnection, {
      memberId: authorized.id,
    });
  typia.assert(profile);
  // 3. Validate profile fields
  TestValidator.equals("member ID matches", profile.id, authorized.id);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, authorized.bio);
  TestValidator.equals("banned status is false", profile.banned, false);
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(profile.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(profile.updated_at);
    return !isNaN(date.getTime());
  });
}
