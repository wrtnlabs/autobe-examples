import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Promote a regular administrator to super administrator status for E2E testing.
 *
 * Creates a new super administrator account by promoting an existing regular administrator account. The target administrator's unique identifier must be provided, as it references an actual administrator record in the system. Session context (href, referrer, ip) is captured for audit trail purposes. The connection is automatically mutated with the JWT access token upon successful promotion.
 *
 * This operation is restricted to existing super administrators and enforces the platform's governance model for expanding the super administrator roster.
 *
 * @param connection Connection to the backend server
 * @param props Properties including the administrator_id to promote and optional overrides
 * @returns Authorized super administrator details including JWT tokens
 */
export async function authorize_super_administrator_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallSuperAdministrator.IJoin>;
  },
): Promise<IECommerceMallSuperAdministrator.IAuthorized> {
  const joinInput = {
    administrator_id:
      props.body?.administrator_id ??
      typia.random<string & tags.Format<"uuid">>(),
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IECommerceMallSuperAdministrator.IJoin;
  return await api.functional.eCommerceMall.auth.superAdministrator.join(
    connection,
    {
      body: joinInput,
    },
  );
}
