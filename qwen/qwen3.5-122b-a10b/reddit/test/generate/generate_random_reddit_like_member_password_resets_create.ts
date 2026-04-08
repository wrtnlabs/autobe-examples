import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_member_password_reset } from "../prepare/prepare_random_reddit_like_member_password_reset";

/**
 * Generate a random password reset request via the API for E2E testing.
 *
 * Prepares random password reset request data using the prepare function, then calls the password reset initiation endpoint. This function tests the password reset flow by submitting an email address and receiving a generic success response.
 *
 * The API intentionally returns a generic success message regardless of whether the email address exists in the system, preventing email enumeration attacks. A cryptographically random reset token is generated and sent to the provided email if an account exists.
 *
 * @param connection The API connection configuration
 * @param props Properties containing optional body data for customization
 * @param props.body Optional partial password reset request to override default random values
 * @returns Password reset operation success confirmation with generic message
 */
export async function generate_random_reddit_like_member_password_resets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeMemberPasswordReset.ICreate> | undefined;
  },
): Promise<IRedditLikeMemberPasswordReset.IResponse> {
  const prepared: IRedditLikeMemberPasswordReset.ICreate =
    prepare_random_reddit_like_member_password_reset(props.body);
  const result: IRedditLikeMemberPasswordReset.IResponse =
    await api.functional.redditLike.member.password_resets.create(connection, {
      body: prepared,
    });
  return result;
}
