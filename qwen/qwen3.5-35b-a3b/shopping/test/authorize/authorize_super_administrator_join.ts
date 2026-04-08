import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new super administrator for E2E testing.
 *
 * Creates a super administrator account with randomized credentials, mutates the connection with the auth token.
 * The email is validated for uniqueness and format, password is hashed securely before storage.
 * Returns JWT access and refresh tokens for immediate authentication.
 */
export async function authorize_super_administrator_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSuperAdministrator.IJoin>;
  },
): Promise<IEcommerceMallSuperAdministrator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    display_name: props.body?.display_name ?? RandomGenerator.name(2),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>() ?? null,
  } satisfies IEcommerceMallSuperAdministrator.IJoin;
  return await api.functional.ecommerceMall.auth.super_administrator.join(
    connection,
    { body: joinInput },
  );
}