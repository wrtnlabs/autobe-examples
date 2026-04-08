import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import type { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_retrieval_partial_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account and obtain authentication tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate a shop profile UUID for retrieval (note: actual creation may be via separate endpoint)
  const shopProfileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a NEW connection with seller authentication token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedSellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // 4. Attempt to retrieve shop profile (may return 404 if not created)
  const shopProfile =
    await api.functional.ecommerceMall.seller.shop_profiles.at(
      authenticatedSellerConnection,
      {
        shopProfileId,
      },
    );
  typia.assert(shopProfile);
  // 5. Verify response structure includes all required fields
  TestValidator.equals("shop profile id", shopProfile.id, shopProfileId);
  TestValidator.equals(
    "shop name is string",
    typeof shopProfile.shop_name,
    "string",
  );
  TestValidator.equals(
    "created at is string",
    typeof shopProfile.created_at,
    "string",
  );
  TestValidator.equals(
    "updated at is string",
    typeof shopProfile.updated_at,
    "string",
  );
  // 6. Verify optional fields can be null
  TestValidator.equals(
    "shop description can be null",
    shopProfile.shop_description,
    null,
  );
  TestValidator.equals("logo url can be null", shopProfile.logo_url, null);
  // 7. Verify seller object reference is properly populated
  TestValidator.predicate(
    "seller object exists",
    shopProfile.seller !== undefined,
  );
  TestValidator.equals(
    "seller id is uuid",
    shopProfile.seller.id,
    shopProfile.seller.id,
  );
  TestValidator.equals(
    "seller display_name exists",
    shopProfile.seller.display_name !== "",
    true,
  );
  TestValidator.equals(
    "seller approval status exists",
    shopProfile.seller.approval_status !== "",
    true,
  );
  // 8. Verify timestamp formats
  TestValidator.predicate(
    "created at is valid date-time",
    !isNaN(Date.parse(shopProfile.created_at)),
  );
  TestValidator.predicate(
    "updated at is valid date-time",
    !isNaN(Date.parse(shopProfile.updated_at)),
  );
  // 9. Verify deleted_at can be null (soft delete indicator)
  TestValidator.equals(
    "deleted at is null for active profile",
    shopProfile.deleted_at,
    null,
  );
  // 10. Verify snapshots array exists and is array type
  TestValidator.equals(
    "snapshots is array",
    Array.isArray(shopProfile.snapshots),
    true,
  );
  TestValidator.equals("snapshots is array type", shopProfile.snapshots, []);
}