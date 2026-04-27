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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_full_profile(
  connection: api.IConnection,
): Promise<void> {
  // Prepare all registration fields with explicit values for validation
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);
  const shopName: string = RandomGenerator.name();
  const shopDescription: string = RandomGenerator.paragraph({ sentences: 2 });
  const logoImage: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  // Create seller-specific connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized: IECommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email,
        password,
        shop_name: shopName,
        shop_description: shopDescription,
        logo_image: logoImage,
        href,
        referrer,
        ip,
      },
    });
  typia.assert(authorized);
  // Validate seller account fields
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals(
    "approval status is pending",
    authorized.approval_status,
    "pending",
  );
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // Validate profile fields
  TestValidator.equals(
    "shop name matches",
    authorized.profile!.shopName,
    shopName,
  );
  TestValidator.equals(
    "shop description matches",
    authorized.profile!.shopDescription,
    shopDescription,
  );
  TestValidator.equals(
    "logo image matches",
    authorized.profile!.logoImage,
    logoImage,
  );
  // Validate token fields
  TestValidator.predicate(
    "access token is non-empty",
    () => authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    () => authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is in the future",
    () => new Date(authorized.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    () => new Date(authorized.token.refreshable_until).getTime() > Date.now(),
  );
  // Verify the access token can be used for subsequent authenticated requests
  TestValidator.predicate("authorization header is set", () => {
    const auth = sellerConnection.headers?.Authorization;
    return (
      typeof auth === "string" &&
      auth.startsWith("Bearer ") &&
      auth.length > "Bearer ".length
    );
  });
}
