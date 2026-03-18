import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_wrong_password_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member with known credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const knownEmail = typia.random<string & tags.Format<"email">>();
  const knownPassword = "CorrectPass123!";
  const registeredMember = await authorize_member_join(joinConnection, {
    body: {
      email: knownEmail,
      password: knownPassword,
      firstName: RandomGenerator.name(),
      lastName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IErpHrmMember.IJoin>,
  });
  typia.assert(registeredMember);
  // Step 2: Attempt login with correct email but wrong password
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  let wrongPasswordError: api.HttpError | undefined;
  try {
    await api.functional.erpHrm.auth.member.login(wrongPasswordConnection, {
      body: {
        email: knownEmail,
        password: "WrongPass123!",
      } satisfies IErpHrmMember.ILogin,
    });
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      wrongPasswordError = error;
    } else {
      throw error;
    }
  }
  // Step 3: Verify 401 Unauthorized for wrong password
  TestValidator.predicate(
    "wrong password returns 401",
    wrongPasswordError !== undefined && wrongPasswordError.status === 401,
  );
  // Step 4: Attempt login with non-existent email
  const nonExistentConnection: api.IConnection = { host: connection.host };
  let nonExistentError: api.HttpError | undefined;
  try {
    await api.functional.erpHrm.auth.member.login(nonExistentConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AnyPass123!",
      } satisfies IErpHrmMember.ILogin,
    });
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      nonExistentError = error;
    } else {
      throw error;
    }
  }
  // Step 5: Verify 401 for non-existent email
  TestValidator.predicate(
    "non-existent email returns 401",
    nonExistentError !== undefined && nonExistentError.status === 401,
  );
  // Step 6: Security requirement - error messages must be identical (ambiguous)
  TestValidator.equals(
    "error messages are identical for security",
    wrongPasswordError?.message,
    nonExistentError?.message,
  );
}
