import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new moderator account for E2E testing.
 *
 * Creates a moderator account with randomized credentials including email, password, and user profile information. The function generates valid test data for all required fields when not explicitly provided in the props. Upon successful registration, the connection is automatically mutated with the authentication token for subsequent API calls.
 *
 * The email must be unique and valid format, password must meet complexity requirements (minimum 8 characters), and display name must be provided. Session context fields (href, referrer, ip) are captured for security auditing.
 */
export async function authorize_moderator_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneModerator.IJoin>;
  },
): Promise<IRedditCloneModerator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    bio: props.body?.bio,
    avatar: props.body?.avatar,
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip,
  } satisfies IRedditCloneModerator.IJoin;
  return await api.functional.redditClone.auth.moderator.join(connection, {
    body: joinInput,
  });
}
