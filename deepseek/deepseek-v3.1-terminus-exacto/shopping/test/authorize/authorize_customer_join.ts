import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_customer_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCustomer.IJoin>;
  },
): Promise<IEcommerceCustomer.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    display_name:
      props.body?.display_name ??
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
    phone_number: props.body?.phone_number ?? RandomGenerator.mobile(),
  } satisfies IEcommerceCustomer.IJoin;
  return await api.functional.ecommerce.auth.customer.join(connection, {
    body: joinInput,
  });
}
