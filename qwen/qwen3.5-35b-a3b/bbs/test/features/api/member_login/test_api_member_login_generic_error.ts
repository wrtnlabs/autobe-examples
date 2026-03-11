import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection, HttpError } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_generic_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a test member account
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = "SecurePassword123!";
  const incorrectPassword = "WrongPassword123!";
  const name = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register member account
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(joinConnection, {
    body: {
      email,
      password: correctPassword,
      name,
      href,
      referrer,
      ip,
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  // 2. Test Case 1: Correct email, wrong password
  const loginConnectionWrongPassword: api.IConnection = {
    host: connection.host,
  };
  let errorWrongPassword: HttpError | null = null;
  try {
    await authorize_member_login(loginConnectionWrongPassword, {
      body: {
        email,
        password: incorrectPassword,
      } satisfies IEconomicPoliticalBoardMember.ILogin,
    });
  } catch (e: unknown) {
    if (e instanceof HttpError) {
      errorWrongPassword = e;
    } else {
      throw e;
    }
  }
  typia.assert(errorWrongPassword);
  // 3. Test Case 2: Non-existent email, correct password
  const loginConnectionNonExistentEmail: api.IConnection = {
    host: connection.host,
  };
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  let errorNonExistentEmail: HttpError | null = null;
  try {
    await authorize_member_login(loginConnectionNonExistentEmail, {
      body: {
        email: nonExistentEmail,
        password: correctPassword,
      } satisfies IEconomicPoliticalBoardMember.ILogin,
    });
  } catch (e: unknown) {
    if (e instanceof HttpError) {
      errorNonExistentEmail = e;
    } else {
      throw e;
    }
  }
  typia.assert(errorNonExistentEmail);
  // 4. Validate HTTP status codes are consistent (401 Unauthorized)
  TestValidator.equals(
    "wrong password returns 401",
    errorWrongPassword!.status,
    401,
  );
  TestValidator.equals(
    "non-existent email returns 401",
    errorNonExistentEmail!.status,
    401,
  );
  // 5. Validate error messages are generic (don't reveal which credential was wrong)
  // Error should not mention specific credential issues
  const genericMessagePattern =
    /^[aA]uthentication failed|[iI]nvalid credentials|[iI]nvalid email or password|authentication error/i;
  TestValidator.predicate(
    "wrong password error message is generic",
    genericMessagePattern.test(errorWrongPassword!.message),
  );
  TestValidator.predicate(
    "non-existent email error message is generic",
    genericMessagePattern.test(errorNonExistentEmail!.message),
  );
  // 6. Validate messages don't reveal specific failure type
  TestValidator.predicate(
    "wrong password error does not mention email specifically",
    !errorWrongPassword!.message.toLowerCase().includes("email not found") &&
      !errorWrongPassword!.message.toLowerCase().includes("email does not exist"),
  );
  TestValidator.predicate(
    "wrong password error does not mention password specifically",
    !errorWrongPassword!.message
      .toLowerCase()
      .includes("password is incorrect") &&
      !errorWrongPassword!.message.toLowerCase().includes("wrong password"),
  );
  TestValidator.predicate(
    "non-existent email error does not mention email specifically",
    !errorNonExistentEmail!.message.toLowerCase().includes("email not found") &&
      !errorNonExistentEmail!.message
        .toLowerCase()
        .includes("email does not exist"),
  );
  TestValidator.predicate(
    "non-existent email error does not mention password specifically",
    !errorNonExistentEmail!.message
      .toLowerCase()
      .includes("password is incorrect") &&
      !errorNonExistentEmail!.message.toLowerCase().includes("wrong password"),
  );
  // 7. Validate both error messages follow same generic pattern
  TestValidator.predicate(
    "both errors use generic authentication message",
    errorWrongPassword!.message.toLowerCase() ===
      errorNonExistentEmail!.message.toLowerCase() ||
      (genericMessagePattern.test(errorWrongPassword!.message) &&
        genericMessagePattern.test(errorNonExistentEmail!.message)),
  );
}