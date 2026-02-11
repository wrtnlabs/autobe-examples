import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a new member to establish valid JWT token
  const memberConnection: api.IConnection = { host: connection.host };
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinData,
  });
  typia.assert(authorized);
  // Retrieve the authenticated user's profile
  const profile =
    await api.functional.redditCommunity.member.profile.at(memberConnection);
  typia.assert(profile);
  // Validate that the response contains expected fields according to IRedditCommunityUserProfile schema
  TestValidator.equals("profile has id", typeof profile.id, "string");
  TestValidator.predicate("id is UUID", /^[0-9a-f-]{36}$/i.test(profile.id));
  TestValidator.equals(
    "profile has display_name",
    typeof profile.display_name,
    "string",
  );
  TestValidator.notEquals(
    "display_name is not empty",
    profile.display_name,
    "",
  );
  TestValidator.equals("profile has karma", typeof profile.karma, "number");
  TestValidator.predicate("karma is int32", Number.isInteger(profile.karma));
  TestValidator.equals(
    "profile has created_at",
    typeof profile.created_at,
    "string",
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(profile.created_at),
  );
  TestValidator.equals(
    "profile has updated_at",
    typeof profile.updated_at,
    "string",
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(profile.updated_at),
  );
  // Validate optional fields are nullable as per schema
  TestValidator.predicate(
    "bio is nullable",
    profile.bio === null ||
      profile.bio === undefined ||
      typeof profile.bio === "string",
  );
  TestValidator.predicate(
    "avatar_url is nullable",
    profile.avatar_url === null ||
      profile.avatar_url === undefined ||
      (typeof profile.avatar_url === "string" &&
        profile.avatar_url.startsWith("http")),
  );
  // Ensure no sensitive fields are included
  TestValidator.predicate("email not present", !("email" in profile));
  TestValidator.predicate(
    "password_hash not present",
    !("password_hash" in profile),
  );
  TestValidator.predicate(
    "id matches authorized user",
    profile.id === authorized.id,
  );
}
