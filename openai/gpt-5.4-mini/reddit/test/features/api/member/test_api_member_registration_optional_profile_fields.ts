import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_optional_profile_fields(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    username: RandomGenerator.alphabets(8),
    displayName: RandomGenerator.name(),
    bio: null,
  } satisfies ICommunityPlatformMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "email should match registration input",
    authorized.email,
    joinBody.email,
  );
  TestValidator.equals(
    "username should match registration input",
    authorized.username,
    joinBody.username,
  );
  TestValidator.equals(
    "display name should match registration input",
    authorized.displayName,
    joinBody.displayName,
  );
  TestValidator.equals(
    "bio should be initialized as null",
    authorized.bio,
    null,
  );
  TestValidator.equals(
    "avatar image URI should be initialized as null",
    authorized.avatarImageUri,
    null,
  );
  TestValidator.predicate(
    "member id should not be empty",
    authorized.id.length > 0,
  );
  TestValidator.predicate(
    "karma should initialize to an integer",
    Number.isInteger(authorized.karma),
  );
  typia.assert(authorized.token);
  TestValidator.predicate(
    "access token should not be empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be valid",
    !Number.isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable until should be valid",
    !Number.isNaN(Date.parse(authorized.token.refreshable_until)),
  );
}
