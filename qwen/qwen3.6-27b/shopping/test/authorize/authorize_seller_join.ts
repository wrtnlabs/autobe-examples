import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new seller for E2E testing.
 *
 * Creates a seller account with randomized credentials and session context. The seller
 * account is created with pending approval status. The seller can log in immediately
 * but seller-specific operations are restricted until an administrator approves
 * the registration. A seller approval request is automatically created and tracked.
 *
 * Generates random email, password, href (referring URI), and referrer header.
 * The IP address is optional and will be undefined if not provided in props.
 */
export async function authorize_seller_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformSeller.IJoin>;
  },
): Promise<IEcommercePlatformSeller.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password:
      props.body?.password ?? typia.random<string & tags.Format<"password">>(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? undefined,
  } satisfies IEcommercePlatformSeller.IJoin;
  return await api.functional.ecommercePlatform.auth.seller.join(connection, {
    body: joinInput,
  });
}
