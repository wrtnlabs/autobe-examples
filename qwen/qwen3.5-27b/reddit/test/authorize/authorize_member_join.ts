import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new member account for E2E testing.
 *
 * Creates a member account with randomized credentials including email, password, and username. The email serves as the unique login identifier, while the username is the public-facing identifier displayed on posts, comments, and profiles. Session context fields (href, referrer, ip) are automatically generated for security tracking.
 *
 * Upon successful registration, the system issues both access and refresh tokens which are returned in the IAuthorized response. The connection is mutated with the access token for subsequent authenticated API requests.
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneMember.IJoin>;
  },
): Promise<IRedditCloneMember.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    username: props.body?.username ?? RandomGenerator.name(1),
  } satisfies IRedditCloneMember.IJoin;
  return await api.functional.redditClone.auth.member.join(connection, {
    body: joinInput,
  });
}
