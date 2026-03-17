import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_with_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection and register member
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Use utility function for member join
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 3. Verify displayName is returned correctly in the response
  TestValidator.equals(
    "displayName exists in authorized response",
    authorized.displayName,
    "non-empty string",
  );
  TestValidator.predicate(
    "displayName is non-empty",
    authorized.displayName.length > 0,
  );
  // 4. Verify all required profile fields are present (typia.assert() validates types)
  TestValidator.equals("id is present", authorized.id !== undefined, true);
  TestValidator.equals(
    "createdAt is present",
    authorized.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "updatedAt is present",
    authorized.updatedAt !== undefined,
    true,
  );
  TestValidator.equals(
    "displayName is present",
    authorized.displayName !== undefined,
    true,
  );
  // 5. Verify authorization token is present and valid
  typia.assert(authorized.token);
  TestValidator.equals(
    "access token exists",
    authorized.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    authorized.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "expired_at is present",
    authorized.token.expired_at !== undefined,
    true,
  );
  TestValidator.equals(
    "refreshable_until is present",
    authorized.token.refreshable_until !== undefined,
    true,
  );
}