import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_administrator_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceAdministrator.IJoin>;
  },
): Promise<IEcommerceAdministrator.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password:
      props.body?.password ??
      (typia.random<string & tags.Format<"password">>() ||
        RandomGenerator.alphaNumeric(16)),
  } satisfies IEcommerceAdministrator.IJoin;
  return await api.functional.ecommerce.auth.administrator.join(connection, {
    body: joinInput,
  });
}
