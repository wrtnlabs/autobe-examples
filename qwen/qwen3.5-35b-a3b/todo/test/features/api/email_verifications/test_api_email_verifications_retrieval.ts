import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberEmailVerification";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verifications_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: typia.random<ITodoAppMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // 2. Create member connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Retrieve email verifications
  const result = await api.functional.todoApp.member.email_verifications.index(
    memberConnection,
    {
      body: typia.random<ITodoAppMemberEmailVerification.IRequest>(),
    },
  );
  typia.assert(result);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    result.pagination.pages >= 0,
  );
  // 5. Validate email verification data structure
  typia.assert(result.data);
  for (const verification of result.data) {
    typia.assert(verification);
    // Verify member association exists with required fields
    typia.assert(verification.member);
    typia.assert(verification.member.id);
    typia.assert(verification.member.email);
    typia.assert(verification.member.displayName);
    // Verify required verification fields
    typia.assert(verification.id);
    typia.assert(verification.expiresAt);
    typia.assert(verification.used);
    typia.assert(verification.createdAt);
    typia.assert(verification.updatedAt);
  }
  // 6. Verify data array is properly typed as array
  TestValidator.predicate("data is array", Array.isArray(result.data));
}
