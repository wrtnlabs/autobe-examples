import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_update_partial_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller setup (registration - approval_status = 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Admin: search for the seller's pending approval request and approve
  const page =
    await api.functional.eCommerceMall.administrator.approval_requests.index(
      adminConnection,
      {
        body: {
          search: sellerEmail,
          status: "pending",
        },
      },
    );
  typia.assert(page);
  const approvalRequest = page.data.find((r) => r.seller.email === sellerEmail);
  if (approvalRequest === undefined)
    throw new Error("Approval request not found for the seller");
  const approved =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: { status: "approved" },
      },
    );
  typia.assert(approved);
  // 4. Seller re-login to get fresh token reflecting approved status
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAuthConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Create a product with specific initial values
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerAuthConnection,
    {
      body: {
        name: "Initial Product Name",
        description: "Initial description",
        base_price: 100.0,
      },
    },
  );
  typia.assert(product);
  // Record pre-update values for verification
  const originalDescription = product.description;
  const originalBasePrice = product.base_price;
  const originalUpdatedAt = product.updated_at;
  const originalSellerId = product.seller.id;
  const originalCategoryId = product.category?.id;
  // 6. Update only the name field
  const updated = await api.functional.eCommerceMall.seller.products.update(
    sellerAuthConnection,
    {
      productId: product.id,
      body: {
        name: "Renamed Product",
      },
    },
  );
  typia.assert(updated);
  // 7. Verification
  TestValidator.equals(
    "name updated to Renamed Product",
    updated.name,
    "Renamed Product",
  );
  TestValidator.equals(
    "description preserved",
    updated.description,
    originalDescription,
  );
  TestValidator.equals(
    "base_price preserved",
    updated.base_price,
    originalBasePrice,
  );
  TestValidator.equals(
    "category preserved",
    updated.category?.id,
    originalCategoryId,
  );
  TestValidator.equals(
    "seller reference preserved",
    updated.seller.id,
    originalSellerId,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updated.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals("images unchanged", updated.images.length, 0);
  TestValidator.equals("variants unchanged", updated.variants.length, 0);
}
