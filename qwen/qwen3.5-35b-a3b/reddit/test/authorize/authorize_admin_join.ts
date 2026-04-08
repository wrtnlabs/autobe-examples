import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new admin account for E2E testing.
 *
 * Creates an administrator account with randomized email and password credentials, then
 * authenticates to obtain JWT access and refresh tokens. The connection is mutated with
 * the authorization token for subsequent authenticated API requests.
 */
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityAdmin.IJoin>;
  },
): Promise<IRedditCommunityAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
  } satisfies IRedditCommunityAdmin.IJoin;
  return await api.functional.redditCommunity.auth.admin.join(connection, {
    body: joinInput,
  });
}
