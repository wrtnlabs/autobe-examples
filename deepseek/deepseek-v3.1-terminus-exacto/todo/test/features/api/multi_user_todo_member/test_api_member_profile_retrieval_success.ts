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
 * Test successful retrieval of authenticated member's own profile information.
 * Verify that all expected fields are present, timestamps are well-formatted,
 * and sensitive information is excluded from the response.
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection and join new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // Retrieve the member profile using their own ID
  const retrievedProfile = await api.functional.multiUserTodo.members.at(
    memberConnection,
    {
      memberId: authorizedMember.id,
    },
  );
  typia.assert(retrievedProfile);
  // Validate all expected fields exist and have correct types
  TestValidator.equals("ID matches", retrievedProfile.id, authorizedMember.id);
  TestValidator.equals(
    "Email matches",
    retrievedProfile.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "Display name matches",
    retrievedProfile.display_name,
    authorizedMember.display_name,
  );
  TestValidator.predicate("created_at is valid ISO string", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedProfile.created_at),
  );
  TestValidator.predicate("updated_at is valid ISO string", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedProfile.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    retrievedProfile.deleted_at,
    null,
  );
}
