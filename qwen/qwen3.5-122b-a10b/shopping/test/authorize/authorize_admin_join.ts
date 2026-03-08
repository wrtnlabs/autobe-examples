import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAdmin.IJoin>;
  },
): Promise<IEcommerceMallAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallAdmin.IJoin;
  return await api.functional.ecommerceMall.auth.admin.join(connection, {
    body: joinInput,
  });
}