import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_super_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSuperAdmin.IJoin>;
  },
): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password:
      props.body?.password ??
      (RandomGenerator.alphaNumeric(16) as string & tags.Format<"password">),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ...(props.body?.ip !== undefined && { ip: props.body.ip }),
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  return await api.functional.ecommerceMall.auth.superAdmin.join(connection, {
    body: joinInput,
  });
}
