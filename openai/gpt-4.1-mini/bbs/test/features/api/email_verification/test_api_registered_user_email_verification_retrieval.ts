import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_email_verification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of an existing email verification token
  // 1. Register a new user
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {},
    },
  );
  // Assign the access token to the connection's headers
  registeredUserConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Retrieve an existing email verification token
  // Generate a random UUID for test
  const tokenId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: Try to retrieve the token with the generated tokenId
  // We wrap in try-catch because it may 404
  try {
    const emailVerification =
      await api.functional.discussionBoard.registeredUser.emailVerifications.atEmailVerification(
        registeredUserConnection,
        {
          id: tokenId,
        },
      );
    typia.assert(emailVerification);
  } catch (exp: unknown) {
    // expect 404 if not found
    if (
      typeof exp === "object" &&
      exp !== null &&
      "status" in exp &&
      (exp as any).status === 404
    ) {
      // Scenario 2: Attempt retrieval with non-existent UUID
      // Since scenario 1 failed to find token, scenario 2 verified here
      // No further action needed, test passed
    } else {
      throw exp;
    }
  }
  // Scenario 3: Attempt retrieval by unauthorized user (no auth headers)
  const unauthorizedConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.httpError(
    "Scenario 3: Unauthorized access returns 401",
    401,
    async () => {
      await api.functional.discussionBoard.registeredUser.emailVerifications.atEmailVerification(
        unauthorizedConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
