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
 * Creates a seller account using the provided registration body and returns the authenticated seller payload from the SDK.
 * The underlying join endpoint also establishes the authentication flow, so this helper can be used immediately in test scenarios that require a signed-in seller.
 */
export async function authorize_seller_join(
  connection: api.IConnection,
  props: {
    body: IMallPlatformSeller.IJoin;
  },
): Promise<IMallPlatformSeller.IAuthorized> {
  return await api.functional.mallPlatform.auth.seller.join(connection, {
    body: props.body,
  });
}
