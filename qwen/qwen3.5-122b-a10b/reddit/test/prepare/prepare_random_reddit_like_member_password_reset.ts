import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like member password reset request data for E2E testing.
 *
 * Generates a complete IRedditLikeMemberPasswordReset.ICreate with randomized email value.
 * The email is formatted as a valid email address using typia.random with email format tag.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete password reset request payload
 */
export function prepare_random_reddit_like_member_password_reset(
  input?: DeepPartial<IRedditLikeMemberPasswordReset.ICreate>,
): IRedditLikeMemberPasswordReset.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
  };
}
