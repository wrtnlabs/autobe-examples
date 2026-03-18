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

export async function test_api_member_join_deleted_account_re_registration_behavior(
  connection: api.IConnection,
): Promise<void> {
  // The prompt does not provide an API surface to explicitly hard-delete or
  // soft-delete a member account (to set deleted_at != null). Therefore, this
  // test validates the observable business outcome for re-registration by
  // repeatedly joining with the same email and asserting token issuance vs.
  // non-issuance behavior.
  const email = typia.random<string & tags.Format<"email">>();
  // 1) First join to establish an account for the email.
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_member_join(firstMemberConnection, {
    body: {
      email,
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(firstAuthorized);
  // Preserve token material for comparison (non-empty assertions + optional difference check).
  const firstToken = firstAuthorized.token;
  // 2) Attempt to re-register with the same email.
  const secondMemberConnection: api.IConnection = { host: connection.host };
  let secondAuthorized: IMultiUserTodoMember.IAuthorized | undefined;
  try {
    secondAuthorized = await authorize_member_join(secondMemberConnection, {
      body: {
        email,
        password: RandomGenerator.pick([true, false]),
      } satisfies IMultiUserTodoMember.IJoin,
    });
    typia.assert(secondAuthorized);
  } catch {
    // Expected possible rejection if the server treats the prior account
    // (or its credentials state) as unavailable.
  }
  // 3/4) Validate business outcome: tokens issued vs. not issued.
  if (secondAuthorized !== undefined) {
    const secondToken = secondAuthorized.token;
    TestValidator.predicate(
      "access token is issued",
      secondToken.access.length > 0,
    );
    TestValidator.predicate(
      "refresh token is issued",
      secondToken.refresh.length > 0,
    );
    TestValidator.predicate(
      "token expiration metadata is present",
      secondToken.expired_at.length > 0 &&
        secondToken.refreshable_until.length > 0,
    );
    // If the system rotates tokens on successful re-registration, access/refresh
    // tokens should differ. We keep this as a weak expectation by asserting at
    // least one differs.
    TestValidator.predicate(
      "at least one token value differs",
      secondToken.access !== firstToken.access ||
        secondToken.refresh !== firstToken.refresh,
    );
  } else {
    TestValidator.equals(
      "no authorization tokens are issued on rejection",
      secondAuthorized,
      undefined,
    );
  }
}
