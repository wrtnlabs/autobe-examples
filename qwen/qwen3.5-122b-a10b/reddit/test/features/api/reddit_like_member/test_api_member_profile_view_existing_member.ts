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

export async function test_api_member_profile_view_existing_member(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test viewing a registered member's public profile information.
   *
   * Validates that any user (including unauthenticated guests) can view another member's public profile by providing the member's UUID. The endpoint returns display name, bio, avatar, karma score, and account timestamps.
   *
   * 1. Create a member account with randomized credentials using authorize_member_join utility.
   * 2. Extract the member ID from the authorized response.
   * 3. Create a guest connection without authentication.
   * 4. Call the member profile endpoint with the member ID.
   * 5. Validate response contains all expected public profile fields and matches the created member's data.
   */
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Extract member ID
  const memberId: string & tags.Format<"uuid"> = authorized.id;
  // 3. Create guest connection (no auth needed for public profile)
  const guestConnection: api.IConnection = { host: connection.host };
  // 4. View member profile
  const profile: IRedditLikeMember = await api.functional.redditLike.members.at(
    guestConnection,
    {
      memberId,
    },
  );
  typia.assert(profile);
  // 5. Validate business logic - profile data matches created member
  TestValidator.equals("member ID matches", profile.id, memberId);
  TestValidator.equals(
    "username matches",
    profile.username,
    authorized.username,
  );
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.predicate(
    "karma score is non-negative for new account",
    profile.karma_score >= 0,
  );
  TestValidator.predicate("created_at is set", profile.created_at.length > 0);
}
