import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verification_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Test email verification with invalid token scenario
  // Expected behavior: API should return 404 error for non-existent token
  try {
    // Attempt to verify email with an invalid token
    await api.functional.redditPlatform.user.email_verifications.update(
      connection,
    );
    throw new Error("Expected validation error but operation succeeded");
  } catch (error) {
    // Validate that the error is a 404 Not Found error
    if (error instanceof api.HttpError) {
      TestValidator.equals("HTTP status should be 404", error.status, 404);
    } else {
      throw error;
    }
  }
}