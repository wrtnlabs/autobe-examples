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

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate unique member credentials
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditLikeMember.IJoin;
  // Execute member registration using utility function
  const member = await authorize_member_join(memberConnection, { body });
  // Validate complete response structure
  typia.assert(member);
  // Validate business logic assertions
  TestValidator.equals("email matches input", member.email, body.email);
  TestValidator.equals(
    "username matches input",
    member.username,
    body.username,
  );
  TestValidator.predicate(
    "emailVerified is false",
    member.emailVerified === false,
  );
  TestValidator.equals("deletedAt is null", member.deletedAt, null);
  TestValidator.predicate(
    "token.access is non-empty",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty",
    member.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid timestamp",
    new Date(member.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid timestamp",
    new Date(member.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "createdAt timestamp exists",
    member.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    member.updatedAt.length > 0,
  );
}
