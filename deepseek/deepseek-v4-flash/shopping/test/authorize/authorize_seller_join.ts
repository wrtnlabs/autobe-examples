import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new seller for E2E testing.
 *
 * Creates a seller account with randomized credentials and shop profile, then mutates the connection with the auth token for subsequent API calls. The seller starts with an approval status of 'pending' and must be approved by an administrator before listing products.
 *
 * @param connection - Connection with host and headers to mutate with auth token
 * @param props - Optional overrides for seller registration fields
 * @returns The authorized seller response with profile and token
 */
export async function authorize_seller_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallSeller.IJoin>;
  },
): Promise<IECommerceMallSeller.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    shop_name: props.body?.shop_name ?? RandomGenerator.name(),
    shop_description: props.body?.shop_description ?? undefined,
    logo_image: props.body?.logo_image ?? undefined,
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? undefined,
  } satisfies IECommerceMallSeller.IJoin;
  return await api.functional.eCommerceMall.auth.seller.join(connection, {
    body: joinInput,
  });
}
