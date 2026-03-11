import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test data isolation by attempting to retrieve another member's profile.
 * Create two separate member accounts and attempt to access one member's
 * profile using the other member's authentication. Verify that the system
 * properly enforces data isolation and returns an appropriate error response
 * (403 Forbidden or 404 Not Found) rather than exposing the other member's
 * profile data.
 */
export async function test_api_member_profile_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1);
  // 2. Create second member account with different connection
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2);
  // 3. Verify member1 can access their own profile
  const member1Profile = await api.functional.multiUserTodo.members.at(
    member1Connection,
    {
      memberId: member1.id,
    },
  );
  typia.assert(member1Profile);
  TestValidator.equals(
    "member1 email matches",
    member1Profile.email,
    member1.email,
  );
  // 4. Verify member2 can access their own profile
  const member2Profile = await api.functional.multiUserTodo.members.at(
    member2Connection,
    {
      memberId: member2.id,
    },
  );
  typia.assert(member2Profile);
  TestValidator.equals(
    "member2 email matches",
    member2Profile.email,
    member2.email,
  );
  // 5. Test data isolation: member1 attempting to access member2's profile
  await TestValidator.error(
    "member1 cannot access member2 profile",
    async () => {
      await api.functional.multiUserTodo.members.at(member1Connection, {
        memberId: member2.id,
      });
    },
  );
  // 6. Test data isolation: member2 attempting to access member1's profile
  await TestValidator.error(
    "member2 cannot access member1 profile",
    async () => {
      await api.functional.multiUserTodo.members.at(member2Connection, {
        memberId: member1.id,
      });
    },
  );
  // 7. Ensure emails are different to confirm separate accounts
  TestValidator.notEquals(
    "members have different emails",
    member1.email,
    member2.email,
  );
}
