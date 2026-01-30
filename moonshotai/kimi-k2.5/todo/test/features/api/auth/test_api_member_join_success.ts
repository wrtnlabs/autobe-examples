import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the member actor
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new member using the authorization utility function
  // This creates a member account with random valid data and authenticates the connection
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/todo/register",
      referrer: "https://example.com",
    },
  });
  // Step 2: Validate the complete response structure using typia
  // This validates all fields including UUID format, email format, timestamps, and token structure
  typia.assert(member);
  // Step 3: Verify business logic - member has valid authentication credentials
  TestValidator.predicate(
    "member has valid access token",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "member has valid refresh token",
    member.token.refresh.length > 0,
  );
  // Step 4: Verify timestamps are valid dates
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(Date.parse(member.createdAt)),
  );
  TestValidator.predicate(
    "token expiration is valid date",
    !isNaN(Date.parse(member.token.expired_at)),
  );
}
