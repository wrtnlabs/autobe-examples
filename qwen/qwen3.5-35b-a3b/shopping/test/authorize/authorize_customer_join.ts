import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_customer_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCustomer.IJoin>;
  },
): Promise<IEcommerceMallCustomer.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? (typia.random<string & tags.Format<"email">>() satisfies string as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? (typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">),
    referrer:
      props.body?.referrer ?? (typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">),
    ip: props.body?.ip ?? (typia.random<string & tags.Format<"ipv4">>() satisfies string as string & tags.Format<"ipv4">),
  } satisfies IEcommerceMallCustomer.IJoin;
  return await api.functional.ecommerceMall.auth.customer.join(connection, {
    body: joinInput,
  });
}