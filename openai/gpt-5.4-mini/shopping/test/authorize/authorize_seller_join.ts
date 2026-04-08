import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new seller for E2E testing.
 *
 * Creates a seller account with caller-provided values when supplied, and
 * fills any missing credentials with randomized valid data.
 *
 * After the join request succeeds, the SDK returns the authenticated seller
 * response and applies the issued access token to the connection for later
 * authenticated requests.
 *
 * This helper is intended for test flows that need a fresh seller session
 * without manually managing authentication state.
 */
export async function authorize_seller_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformSeller.IJoin>;
  },
): Promise<IMallPlatformSeller.IAuthorized> {
  const body = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies IMallPlatformSeller.IJoin;
  return await api.functional.mallPlatform.auth.seller.join(connection, {
    body,
  });
}
