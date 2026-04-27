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

export async function test_api_seller_registration_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare minimal registration data with only required fields
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // 2. Register seller with ONLY required fields, omitting optional ones
  const output = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      shop_name: shopName,
      href,
      referrer,
    } satisfies DeepPartial<IECommerceMallSeller.IJoin>,
  });
  typia.assert(output);
  // 3. Verify basic seller fields
  TestValidator.equals("email matches input", output.email, email);
  TestValidator.equals(
    "approval status is pending",
    output.approval_status,
    "pending",
  );
  // 4. Verify profile is present (created atomically during registration)
  TestValidator.predicate("profile is not null", output.profile !== null);
  const profile = output.profile!;
  // 5. Verify optional profile fields default to null when omitted
  TestValidator.equals("shop name matches input", profile.shopName, shopName);
  TestValidator.equals(
    "shop description is null",
    profile.shopDescription,
    null,
  );
  TestValidator.equals("logo image is null", profile.logoImage, null);
  // 6. Verify token fields are present and non-empty
  TestValidator.predicate(
    "access token present",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at present",
    typeof output.token.expired_at === "string" &&
      output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until present",
    typeof output.token.refreshable_until === "string" &&
      output.token.refreshable_until.length > 0,
  );
}
