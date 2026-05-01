import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new member for E2E testing.
 *
 * Creates a member account with randomized credentials — email, password, and
 * username — then mutates the connection with the returned JWT access token.
 * The href and referrer fields capture the registration source context, while
 * the optional ip field supports SSR scenarios where the client IP is unavailable.
 *
 * All fields can be overridden via props.body; missing values are filled with
 * random data conforming to the target format constraints.
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityHubMember.IJoin>;
  },
): Promise<ICommunityHubMember.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    username: props.body?.username ?? RandomGenerator.name(1),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityHubMember.IJoin;
  return await api.functional.communityHub.auth.member.join(connection, {
    body: joinInput,
  });
}
