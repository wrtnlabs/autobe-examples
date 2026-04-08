import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new member account for E2E testing.
 *
 * Creates a member account with randomized credentials including email, password, and username. Mutates the connection with the authorization token for subsequent authenticated API calls.
 *
 * **Random Data Generation**
 *
 * - Email: Generated with valid email format using typia.random
 * - Password: 16-character alphanumeric string for security
 * - Username: Single-word name for public identification
 * - Href: URI of the registration page
 * - Referrer: Optional URI of the referring page
 *
 * **Usage**
 *
 * After successful registration, the connection object is automatically mutated with the access token in the Authorization header. The returned IAuthorized object contains the complete member profile and JWT tokens for session management.
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeMember.IJoin>;
  },
): Promise<IRedditLikeMember.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    username: props.body?.username ?? RandomGenerator.name(1),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditLikeMember.IJoin;
  return await api.functional.redditLike.auth.member.join(connection, {
    body: joinInput,
  });
}
