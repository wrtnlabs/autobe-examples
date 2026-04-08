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
 * Register and authenticate a new member for E2E testing.
 *
 * Creates a member account with randomized credentials (email, password, username), mutates the connection with the auth token, and returns the authorized member profile with JWT tokens.
 *
 * The function generates random test data for all required fields: email using typia format generator, password using RandomGenerator.alphaNumeric(16), username using RandomGenerator.name(1), and session context fields (href, referrer, ip) using appropriate format generators. Optional ip field is also randomized for complete test coverage.
 *
 * @param connection - The API connection object that will be mutated with the authorization token
 * @param props - Optional override properties for customizing the registration data
 * @returns The authorized member profile including JWT access and refresh tokens
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
