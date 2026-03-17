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

export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for member actor
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate random registration data
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(16);
  // Step 1: Register new member and authenticate
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      username,
      password,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Retrieve current member profile
  const profile =
    await api.functional.redditLike.member.me.at(memberConnection);
  typia.assert(profile);
  // Step 3: Validate business logic - profile data matches registration
  TestValidator.equals("email matches registration", profile.email, email);
  TestValidator.equals(
    "username matches registration",
    profile.username,
    username,
  );
  TestValidator.equals(
    "member id matches authorized",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "emailVerified is false for new account",
    profile.emailVerified,
    false,
  );
  TestValidator.equals(
    "deletedAt is null for active account",
    profile.deletedAt,
    null,
  );
}
