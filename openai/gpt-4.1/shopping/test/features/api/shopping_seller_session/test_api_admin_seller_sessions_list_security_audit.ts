import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSellerSession";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";
import type { IShoppingSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerSession";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Test admin session list security audit for seller.
 *
 * 1. Register admin
 * 2. Register seller by creating a product
 * 3. Register address for seller
 * 4. As admin, list seller sessions, verify structure and info
 * 5. Test error on invalid/non-existent sellerId
 * 6. Test non-admin/anonymous access is denied
 */
export async function test_api_admin_seller_sessions_list_security_audit(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminInput = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(10) + "!Ab1",
    name: RandomGenerator.name(),
    role: "superadmin",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Register seller by creating a product
  // (This test suite does not have an explicit seller registration API, so use product creation)
  const productInput = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri:
      "https://cdn.example.com/image/" + RandomGenerator.alphaNumeric(15),
    status: "draft",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const sellerProduct = await api.functional.shopping.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(sellerProduct);
  const sellerId = sellerProduct.seller.id;

  // 3. Register at least one address for the seller via admin
  const sellerAddressInput = {
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: "Seoul",
    state: "Seoul",
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_primary: true,
    is_return_address: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(),
  } satisfies IShoppingSellerAddress.ICreate;
  const sellerAddress =
    await api.functional.shopping.admin.sellers.addresses.create(connection, {
      sellerId,
      body: sellerAddressInput,
    });
  typia.assert(sellerAddress);

  // 4. As admin, retrieve sessions list for seller and validate
  const sessionRequest = {
    limit: 20,
    page: 1,
    expired: undefined,
    created_after: undefined,
    created_before: undefined,
    ip: undefined,
    href: undefined,
    referrer: undefined,
  } satisfies IShoppingSellerSession.IRequest;
  const sessionsPage =
    await api.functional.shopping.admin.sellers.sessions.index(connection, {
      sellerId,
      body: sessionRequest,
    });
  typia.assert(sessionsPage);

  // Sessions list checks
  TestValidator.predicate(
    "seller sessions list should not be empty",
    Array.isArray(sessionsPage.data) && sessionsPage.data.length > 0,
  );
  for (const session of sessionsPage.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session.id is a uuid",
      typeof session.id === "string" && session.id.length > 0,
    );
    TestValidator.predicate(
      "session.shopping_seller_id matches",
      session.shopping_seller_id === sellerId,
    );
    TestValidator.predicate(
      "session.ip is not empty",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "session.href is not empty",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "session.referrer is not empty",
      typeof session.referrer === "string" && session.referrer.length > 0,
    );
    TestValidator.predicate(
      "session.created_at is ISO date",
      typeof session.created_at === "string" && session.created_at.length > 0,
    );
    if (session.expired_at !== null && session.expired_at !== undefined) {
      TestValidator.predicate(
        "session.expired_at is ISO date",
        typeof session.expired_at === "string" && session.expired_at.length > 0,
      );
    }
  }

  // 5. Attempt to list sessions of invalid/non-existent seller id
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "listing sessions with non-existent sellerId should throw",
    async () => {
      await api.functional.shopping.admin.sellers.sessions.index(connection, {
        sellerId: randomSellerId,
        body: sessionRequest,
      });
    },
  );

  // 6. Attempt to access as non-admin (simulate with unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated/non-admin should be forbidden from admin endpoint",
    async () => {
      await api.functional.shopping.admin.sellers.sessions.index(unauthConn, {
        sellerId,
        body: sessionRequest,
      });
    },
  );
}
