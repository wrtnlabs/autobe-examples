import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_view_existing_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account to obtain a valid memberId
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve the public profile using the memberId
  const profile = await api.functional.redditLike.profiles.at(connection, {
    memberId: authorized.id,
  });
  typia.assert(profile);
  // 3. Verify the profile contains expected public fields
  TestValidator.equals("member id matches", profile.member.id, authorized.id);
  TestValidator.equals(
    "username matches",
    profile.member.username,
    authorized.username,
  );
  TestValidator.equals(
    "display name exists",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.predicate(
    "karma score is integer",
    Number.isInteger(profile.karma_score),
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.created_at),
  );
  // 4. Verify bio and avatar are present (may be null)
  TestValidator.predicate(
    "bio is string or null",
    typeof profile.bio === "string" || profile.bio === null,
  );
  TestValidator.predicate(
    "avatar is URI string or null",
    profile.avatar === null || typeof profile.avatar === "string",
  );
}
