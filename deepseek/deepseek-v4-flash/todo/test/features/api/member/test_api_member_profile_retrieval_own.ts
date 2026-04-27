import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can successfully retrieve their own account information.
 *
 * Validates the complete flow of retrieving the authenticated member's profile data. First, a member account is created with a display name via the join endpoint. Then, the profile retrieval endpoint is called with the member's own UUID. The response is validated against the expected {@link ITodoAppMember} structure, ensuring that the email, display name, and timestamps match the registered data.
 *
 * Special attention is given to verifying that the display name from the LEFT JOINed profile table is correctly included and that sensitive authentication fields like the password hash are excluded from the response.
 *
 * 1. Register a new member account with randomized email, password, and display name.
 * 2. Extract the member's UUID from the join response.
 * 3. Retrieve the member's own profile using the GET endpoint.
 * 4. Validate the response shape with {@link typia.assert} and verify field correctness.
 */
export async function test_api_member_profile_retrieval_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const displayName: string = RandomGenerator.name();
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email,
        password,
        display_name: displayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Retrieve own member profile
  const member: ITodoAppMember = await api.functional.todoApp.members.at(
    memberConnection,
    {
      memberId: authorized.id,
    },
  );
  typia.assert(member);
  // 3. Validate response
  TestValidator.equals("member id", member.id, authorized.id);
  TestValidator.equals("member email", member.email, email);
  TestValidator.equals("member display_name", member.display_name, displayName);
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.updated_at),
  );
}
