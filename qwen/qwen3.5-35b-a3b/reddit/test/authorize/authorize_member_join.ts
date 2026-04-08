import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new member account for E2E testing.
 *
 * Creates a member account with randomized credentials, mutates the connection with the auth token.
 *
 * The function generates random but valid data for all required registration fields when not provided
 * in props.body. This includes email, password, username, page URL, and referrer URL. An optional IP
 * address may also be generated for session tracking. The SDK automatically handles token mutation
 * on the connection object.
 *
 * @param connection - E2E test API connection instance
 * @param props - Optional join request properties
 * @param props.body - Partial registration request containing credentials and session context
 * @returns Authorization response with member identity and access tokens
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityMember.IJoin>;
  },
): Promise<IRedditCommunityMember.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    username: props.body?.username ?? RandomGenerator.name(1),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCommunityMember.IJoin;
  return await api.functional.redditCommunity.auth.member.join(connection, {
    body: joinInput,
  });
}
