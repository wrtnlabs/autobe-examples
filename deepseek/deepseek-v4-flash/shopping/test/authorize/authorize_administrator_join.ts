import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new administrator for E2E testing.
 *
 * Creates an administrator account with randomized credentials, mutates the connection with the auth token, and returns the authorized administrator details.
 *
 * The `email` field must be unique across all administrators — duplicate email registration causes a 409 Conflict error. The `password` is securely hashed by the backend using bcrypt before storage. The `href` and `referrer` fields are captured for session audit trail and stored in the administrator session record. The `ip` field is optional because in server-side rendering (SSR) contexts the client cannot reliably determine its own public IP address — the server captures it as a fallback.
 *
 * This function is designed for E2E test scenarios where a fresh administrator account needs to be created and authenticated in a single step.
 *
 * @param connection - The API connection to mutate with the authorization token
 * @param props - Configuration for the administrator join request, with optional field overrides
 * @returns The authenticated administrator account details with JWT tokens
 */
export async function authorize_administrator_join(
  connection: api.IConnection,
  props: {
    body: IECommerceMallAdministrator.IJoin;
  },
): Promise<IECommerceMallAdministrator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IECommerceMallAdministrator.IJoin;
  return await api.functional.eCommerceMall.auth.administrator.join(
    connection,
    {
      body: joinInput,
    },
  );
}
