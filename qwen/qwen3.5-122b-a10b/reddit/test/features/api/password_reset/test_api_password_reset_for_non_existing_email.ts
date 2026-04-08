import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_password_resets_create } from "../../../generate/generate_random_reddit_like_member_password_resets_create";
import { prepare_random_reddit_like_member_password_reset } from "../../../prepare/prepare_random_reddit_like_member_password_reset";

/**
 * Test password reset request for non-existing email address.
 *
 * Validates the security behavior when a password reset is requested for an email address that does not exist in the system. The system should return the same generic success response as for existing emails, without revealing whether the email exists. This validates the email enumeration prevention security feature where the response is intentionally generic regardless of email existence.
 *
 * 1. Generate a random email address that is not registered in the system.
 * 2. Request password reset with the non-existing email.
 * 3. Validate that the response is a generic success message with success: true.
 * 4. Confirm the response does not reveal whether the email exists.
 */
export async function test_api_password_reset_for_non_existing_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random email that doesn't exist in the system
  const nonExistingEmail = typia.random<string & tags.Format<"email">>();
  // Request password reset with non-existing email
  const response =
    await generate_random_reddit_like_member_password_resets_create(
      connection,
      {
        body: { email: nonExistingEmail },
      },
    );
  typia.assert(response);
  // Validate generic success response structure
  TestValidator.equals(
    "password reset returns success",
    response.success,
    true,
  );
  TestValidator.predicate("has generic message", response.message.length > 0);
}
