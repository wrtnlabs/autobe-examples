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

export async function test_api_member_profile_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Retrieve the member's public profile
  const profile = await api.functional.discussionBoard.members.at(
    memberConnection,
    {
      memberId: authorized.id,
    },
  );
  typia.assert(profile);
  // 3. Verify the profile contains expected public fields
  TestValidator.equals("member id matches", profile.id, authorized.id);
  TestValidator.equals(
    "display name matches",
    profile.displayName,
    authorized.displayName,
  );
  TestValidator.equals("bio is null for new member", profile.bio, null);
  TestValidator.predicate(
    "createdAt is valid ISO datetime",
    typeof profile.createdAt === "string" && profile.createdAt.length > 0,
  );
  // 4. Verify sensitive fields are NOT exposed (privacy protection)
  const profileKeys = Object.keys(profile);
  TestValidator.predicate(
    "email is NOT exposed",
    !profileKeys.includes("email"),
  );
  TestValidator.predicate(
    "banned is NOT exposed",
    !profileKeys.includes("banned"),
  );
  TestValidator.predicate(
    "updatedAt is NOT exposed",
    !profileKeys.includes("updatedAt"),
  );
  TestValidator.predicate(
    "deletedAt is NOT exposed",
    !profileKeys.includes("deletedAt"),
  );
}
