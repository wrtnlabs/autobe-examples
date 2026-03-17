import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
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
 * Test viewing an active member's public profile successfully.
 *
 * This test validates the GET /redditClone/members/{memberId} endpoint by:
 * 1. Creating a new member account via auth join
 * 2. Retrieving the member's profile using their ID
 * 3. Verifying all required profile fields are present and correctly formatted
 * 4. Confirming karma_score starts at 0 for new members
 * 5. Validating timestamps are proper ISO date-time strings
 */
export async function test_api_member_profile_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
  typia.assert(joinResult);
  // 2. Extract member ID for profile retrieval
  const memberId: string & tags.Format<"uuid"> = joinResult.id;
  // 3. Retrieve the member's public profile
  const profile: IRedditCloneMember =
    await api.functional.redditClone.members.at(connection, {
      memberId: memberId,
    });
  typia.assert(profile);
  // 4. Validate profile contains all required fields and matches registration data
  TestValidator.equals("member id matches", profile.id, memberId);
  TestValidator.equals(
    "username matches",
    profile.username,
    joinResult.username,
  );
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    joinResult.display_name,
  );
  // Note: email is NOT part of public profile (privacy) - only in IAuthorized
  // 5. Verify karma_score is 0 for new member
  TestValidator.equals("karma score starts at 0", profile.karma_score, 0);
  // 6. Verify timestamps are valid ISO date-time strings
  TestValidator.predicate("created_at is valid date", () => {
    const date = new Date(profile.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date", () => {
    const date = new Date(profile.updated_at);
    return !isNaN(date.getTime());
  });
  // 7. Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
  // 8. Verify optional fields exist (bio and avatar can be null/undefined for new members)
  TestValidator.predicate("bio is nullable", () => {
    return (
      profile.bio === null ||
      profile.bio === undefined ||
      typeof profile.bio === "string"
    );
  });
  TestValidator.predicate("avatar is nullable", () => {
    return (
      profile.avatar === null ||
      profile.avatar === undefined ||
      typeof profile.avatar === "string"
    );
  });
}
