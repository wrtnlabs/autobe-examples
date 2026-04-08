import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_creation_blocked_for_rejected_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin registers
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Step 2: Admin logs in
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 3: Admin creates a category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminLoginConnection,
    {},
  );
  typia.assert(category);
  // Step 4: Seller registers (will have pending status)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 5: Admin retrieves pending seller approvals
  const approvalsResponse =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminLoginConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalsResponse);
  // Find the pending approval for our seller
  const pendingApproval = approvalsResponse.data.find(
    (approval) => approval.seller.email === sellerEmail,
  );
  TestValidator.equals(
    "pending approval exists",
    pendingApproval !== undefined,
    true,
  );
  // Step 6: Admin rejects the seller
  await api.functional.ecommerceMall.admin.admin.seller_approvals.reject(
    adminLoginConnection,
    {
      approvalId: pendingApproval!.id,
      body: {
        rejectionReason: "Seller does not meet our requirements at this time.",
      } satisfies IEcommerceMallSellerApproval.IReject,
    },
  );
  // Step 7: Rejected seller attempts product creation - should fail
  const rejectedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(rejectedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Attempt to create product with rejected seller - should throw error
  await TestValidator.error(
    "product creation blocked for rejected seller",
    async () => {
      await api.functional.ecommerceMall.seller.products.create(
        rejectedSellerConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            categoryId: category.id,
            basePrice: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          } satisfies IEcommerceMallProduct.ICreate,
        },
      );
    },
  );
}
