import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member join returns consistent auth+profile data structure.

 * Validates that a successful first-time member join response includes the full
 * authenticated profile payload and authorization token pair.
 *
 * 1. Member registration is executed via POST /multiUserTodo/auth/member/join.
 * 2. Response structure is validated to match IMultiUserTodoUserProfile.IAuthorized.
 * 3. Ensures deleted_at is exactly null for a newly joined (non-soft-deleted)
 *    profile.
 */
export async function test_api_member_registration_response_structure_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authorize member via join (required prerequisite for member actor workflows)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    display_name: RandomGenerator.name(),
    password: typia.random<
      string & tags.MinLength<1> & tags.Format<"password">
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoUserProfile.IJoin;
  const joined = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(joined);
  // 2) Validate deleted_at is exactly null for a first-time join result.
  TestValidator.equals(
    "deleted_at should be null on first join",
    joined.deleted_at,
    null,
  );
  // 3) Validate token sub-structure fields exist (typia.assert(joined) already
  // validates formats, but we still assert business-relevant presence).
  TestValidator.predicate("token has access", joined.token.access.length > 0);
  TestValidator.predicate("token has refresh", joined.token.refresh.length > 0);
}
