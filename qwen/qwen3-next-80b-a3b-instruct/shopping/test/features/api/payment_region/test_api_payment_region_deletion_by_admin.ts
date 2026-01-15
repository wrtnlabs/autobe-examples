import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";
import { prepare_random_shopping_mall_payment_region } from "../../../prepare/prepare_random_shopping_mall_payment_region";
import { generate_random_shopping_mall_admin_payment_regions_create } from "../../../generate/generate_random_shopping_mall_admin_payment_regions_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_region_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
        referrer: `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a payment region with valid configuration using the generator function
  const createdRegion: IShoppingMallPaymentRegion =
    await generate_random_shopping_mall_admin_payment_regions_create(
      adminConnection,
      {
        body: {
          region_code: "US",
          currency_code: "USD",
          primary_gateway: "stripe",
          tax_regulations: "US-NA",
        },
      },
    );
  typia.assert(createdRegion);
  // Step 3: Delete the created payment region using its region_code as identifier
  await api.functional.shoppingMall.admin.payment_regions.erase(
    adminConnection,
    {
      regionId: createdRegion.region_code,
    },
  );
  // Step 4: Validate hard delete behavior: attempting to delete the same region again should fail
  // This is the only available validation since no read endpoint exists
  await TestValidator.error(
    "deleting already-deleted region should fail",
    async () => {
      await api.functional.shoppingMall.admin.payment_regions.erase(
        adminConnection,
        {
          regionId: createdRegion.region_code,
        },
      );
    },
  );
}