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

export async function test_api_member_profile_update_maximum_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Prepare display_name with exactly 100 characters (maximum allowed)
  const maxLengthDisplayName = RandomGenerator.alphabets(100);
  // 3. Update profile with maximum length display name
  const updatedMember =
    await api.functional.multiUserTodo.member.profile.update(memberConnection, {
      body: {
        display_name: maxLengthDisplayName,
      } satisfies IMultiUserTodoMember.IUpdate,
    });
  typia.assert(updatedMember);
  // 4. Validate response has required fields with correct types
  typia.assert(updatedMember.id);
  typia.assert(updatedMember.email);
  typia.assert(updatedMember.created_at);
  typia.assert(updatedMember.updated_at);
  typia.assert(updatedMember.deleted_at);
  // 5. Validate email matches the authenticated user
  TestValidator.equals(
    "email matches authenticated user",
    updatedMember.email,
    member.email,
  );
  // 6. Validate created_at was not modified
  TestValidator.equals(
    "created_at unchanged after update",
    updatedMember.created_at,
    member.created_at,
  );
  // 7. Validate updated_at is a valid ISO 8601 date-time format
  TestValidator.predicate(
    "updated_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(
      updatedMember.updated_at,
    ),
  );
}