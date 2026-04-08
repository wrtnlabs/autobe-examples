import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Generate unique registration credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // 12 chars, satisfies minLength<8>
    username:
      RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3), // satisfies 3-20 chars, alphanumeric + underscore
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  // 3. Register new member via utility function
  const output = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(output);
  // 4. Validate member identity fields
  TestValidator.equals("member email matches", output.email, joinInput.email);
  TestValidator.equals(
    "member username matches",
    output.username,
    joinInput.username,
  );
  TestValidator.equals("initial karma", output.karma, 0);
  TestValidator.predicate(
    "id is valid uuid",
    /^[0-9a-f-]{36}$/i.test(output.id),
  );
  // 5. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    output.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    output.updated_at !== undefined,
  );
  TestValidator.equals(
    "created_at equals updated_at",
    output.created_at,
    output.updated_at,
  );
  TestValidator.predicate(
    "deleted_at is null (active)",
    output.deleted_at === null,
  );
  // 6. Validate authorization token structure
  TestValidator.equals(
    "access token exists",
    output.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    output.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "expired_at is valid",
    output.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    output.token.refreshable_until !== undefined,
  );
}
