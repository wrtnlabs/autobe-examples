import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
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
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_snapshot_admin_listing_active_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {});
  // 2. Register a new seller
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {});
  // 3. Admin approves the seller registration
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminJoinConnection,
      { sellerId: sellerAuth.id },
    );
  typia.assert(approvedSeller);
  // 4. Login as the approved seller using the email from join
  // Note: authorize_seller_join doesn't return the password, so we use the generated one from join
  // Since we can't access internal random generation, we need to use the auth object properly
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  // Get credentials from join response - the join response doesn't contain password
  // We need to reconstruct login by using the join function's random generation
  // However, since authorize_seller_join uses RandomGenerator internally,
  // we should use the auth response's email to login
  // The password was auto-generated, so we need to store/use it properly
  // For this test, we'll use the pattern where join creates and we re-authenticate
  // Actually, looking at authorize_seller_join - it generates random credentials internally
  // and returns IAuthorized which doesn't include password
  // The login function requires the original password
  // Solution: Re-register or use a different approach
  // Since this is an E2E test, we can use the same credentials approach
  const sellerEmail = sellerAuth.email;
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // Re-register the seller with known password (or use admin to approve existing)
  const newSellerJoin: api.IConnection = { host: connection.host };
  const newSellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    newSellerJoin,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  // Approve the new seller
  const approvedNewSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminJoinConnection,
      { sellerId: newSellerAuth.id },
    );
  typia.assert(approvedNewSeller);
  // Login as approved seller with known password
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.login(sellerConnection, {
    body: {
      email: newSellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 5. Create a new product - need a valid category
  // First get categories from the system (using a placeholder approach)
  // Since we don't have a category listing endpoint, we'll create product
  // with a generated category ID that the system should validate
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 6. Update the product multiple times to create historical snapshots
  for (let i = 0; i < 3; i++) {
    const updated =
      await api.functional.ecommerceMall.seller.sellers.me.products.patchByProductid(
        sellerConnection,
        {
          productId: product.id,
          body: {
            name: `${RandomGenerator.paragraph({ sentences: 1 })} - Update ${i + 1}`,
            description: `Updated description ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IEcommerceMallProduct.IUpdate,
        },
      );
    typia.assert(updated);
  }
  // 7. Admin already authenticated via adminJoinConnection
  // Use the admin connection to query snapshots
  // 8. Call the product snapshots endpoint with the product ID
  const snapshots =
    await api.functional.ecommerceMall.admin.admin.products.snapshots.at(
      adminJoinConnection,
      { productId: product.id },
    );
  typia.assert(snapshots);
  // 9. Validate response contains paginated list of snapshots
  TestValidator.predicate(
    "snapshots data exists",
    snapshots.data !== undefined,
  );
  TestValidator.predicate(
    "snapshots array has items",
    snapshots.data.length > 0,
  );
  // 10. Validate snapshots are returned in chronological order (oldest first)
  for (let i = 1; i < snapshots.data.length; i++) {
    const prevDate = new Date(snapshots.data[i - 1].createdAt).getTime();
    const currDate = new Date(snapshots.data[i].createdAt).getTime();
    TestValidator.predicate(
      `snapshot ${i} is after snapshot ${i - 1}`,
      currDate >= prevDate,
    );
  }
  // 11. Validate each snapshot includes required fields
  for (const snapshot of snapshots.data) {
    TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    TestValidator.predicate("snapshot has name", snapshot.name !== undefined);
    TestValidator.predicate(
      "snapshot has description",
      snapshot.description !== undefined,
    );
    TestValidator.predicate(
      "snapshot has basePrice",
      snapshot.basePrice !== undefined,
    );
    TestValidator.predicate(
      "snapshot has categoryName",
      snapshot.categoryName !== undefined,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      snapshot.createdAt !== undefined,
    );
    TestValidator.predicate(
      "snapshot has productId",
      snapshot.productId !== undefined,
    );
    TestValidator.equals("productId matches", snapshot.productId, product.id);
    TestValidator.predicate(
      "snapshot has seller info",
      snapshot.seller !== undefined,
    );
    TestValidator.equals(
      "seller id matches",
      snapshot.seller.id,
      newSellerAuth.id,
    );
  }
  // 12. Validate pagination metadata is present
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    snapshots.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    snapshots.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records count",
    snapshots.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages count",
    snapshots.pagination.pages !== undefined,
  );
  TestValidator.predicate(
    "records count matches data length",
    snapshots.pagination.records >= snapshots.data.length,
  );
}
