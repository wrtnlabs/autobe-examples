import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member with valid credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2. Build two login request bodies
  //    (a) completely fake email that was never registered
  const fakeLoginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmTimeTrackingMember.ILogin;
  //    (b) registered member's email but wrong password
  const wrongPasswordBody = {
    email: joinInput.email,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmTimeTrackingMember.ILogin;
  // 3. Login with non-existent email — expect 401 HttpError
  const loginConnection: api.IConnection = { host: connection.host };
  let nonExistentError: string | null = null;
  try {
    await api.functional.hrmTimeTracking.auth.member.login(loginConnection, {
      body: fakeLoginBody,
    });
  } catch (err) {
    if (err instanceof api.HttpError) {
      nonExistentError = err.message;
    } else {
      throw err;
    }
  }
  // 4. Login with correct email but wrong password — expect 401 HttpError
  let wrongPasswordError: string | null = null;
  try {
    await api.functional.hrmTimeTracking.auth.member.login(loginConnection, {
      body: wrongPasswordBody,
    });
  } catch (err) {
    if (err instanceof api.HttpError) {
      wrongPasswordError = err.message;
    } else {
      throw err;
    }
  }
  // 5. Both login attempts must have failed
  TestValidator.predicate(
    "non-existent email login must fail",
    nonExistentError !== null,
  );
  TestValidator.predicate(
    "wrong password login must fail",
    wrongPasswordError !== null,
  );
  // 6. Both must return the identical generic error message (prevent account enumeration)
  TestValidator.equals(
    "error message for non-existent email must match error message for wrong password",
    nonExistentError,
    wrongPasswordError,
  );
}
