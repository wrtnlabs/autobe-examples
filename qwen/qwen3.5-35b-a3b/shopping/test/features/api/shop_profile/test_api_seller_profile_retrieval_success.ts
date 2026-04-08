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

export async function test_api_seller_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account (returns IAuthorized with JWT tokens)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate shop profile ID for retrieval
  const shopProfileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve shop profile using authenticated connection
  const shopProfile =
    await api.functional.ecommerceMall.seller.shop_profiles.at(
      sellerConnection,
      {
        shopProfileId,
      },
    );
  typia.assert(shopProfile);
  // 4. Validate required fields exist
  TestValidator.equals("shop profile id", shopProfile.id, shopProfileId);
  TestValidator.equals(
    "shop_name exists",
    shopProfile.shop_name !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at exists",
    shopProfile.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at exists",
    shopProfile.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "seller reference exists",
    shopProfile.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshots array exists",
    Array.isArray(shopProfile.snapshots),
    true,
  );
  // 5. Verify seller reference matches authenticated seller's ID
  TestValidator.equals(
    "seller ID matches",
    shopProfile.seller.id,
    sellerAuth.id,
  );
  // 6. Verify seller reference contains required fields
  TestValidator.equals(
    "display_name exists",
    shopProfile.seller.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "approval_status exists",
    shopProfile.seller.approval_status !== undefined,
    true,
  );
  TestValidator.equals(
    "is_suspended exists",
    shopProfile.seller.is_suspended !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at exists",
    shopProfile.seller.created_at !== undefined,
    true,
  );
  // 7. Verify optional fields can be null (logo_url and deleted_at)
  TestValidator.equals(
    "logo_url is string or null",
    shopProfile.logo_url === null || typeof shopProfile.logo_url === "string",
    true,
  );
  TestValidator.equals(
    "deleted_at is string or null",
    shopProfile.deleted_at === null ||
      typeof shopProfile.deleted_at === "string",
    true,
  );
  // 8. Verify shop_description can be null
  TestValidator.equals(
    "shop_description is string or null",
    shopProfile.shop_description === null ||
      typeof shopProfile.shop_description === "string",
    true,
  );
}
