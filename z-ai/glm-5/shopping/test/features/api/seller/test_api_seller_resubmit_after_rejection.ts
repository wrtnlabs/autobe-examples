import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_resubmit_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const originalShopName = RandomGenerator.name(2);
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shopName: originalShopName,
      shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
      logoImage: typia.random<string & tags.Format<"url">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // Store original email for verification
  const originalEmail = joinResult.email;
  // Step 2: Prepare resubmit data with updated shop information
  const updatedShopName = RandomGenerator.name(2) + " Updated";
  const updatedShopDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedLogoImage = typia.random<string & tags.Format<"url">>();
  // Step 3: Call resubmit endpoint
  const resubmitResult = await api.functional.shoppingMall.seller.resubmit(
    sellerConnection,
    {
      body: {
        shop_name: updatedShopName,
        shop_description: updatedShopDescription,
        logo_image: updatedLogoImage,
      } satisfies IShoppingMallSeller.IResubmit,
    },
  );
  typia.assert(resubmitResult);
  // Step 4: Validate the response
  TestValidator.equals(
    "approval_status should be pending",
    resubmitResult.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection_reason should be null",
    resubmitResult.rejection_reason,
    null,
  );
  TestValidator.equals(
    "shop_name should match updated value",
    resubmitResult.shop_name,
    updatedShopName,
  );
  TestValidator.equals(
    "shop_description should match updated value",
    resubmitResult.shop_description,
    updatedShopDescription,
  );
  TestValidator.equals(
    "logo_image should match updated value",
    resubmitResult.logo_image,
    updatedLogoImage,
  );
  TestValidator.equals(
    "email should remain unchanged",
    resubmitResult.email,
    originalEmail,
  );
}
