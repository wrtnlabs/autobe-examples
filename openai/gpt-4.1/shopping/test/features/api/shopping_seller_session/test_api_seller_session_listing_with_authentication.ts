import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSellerSession";
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
 * Validate session listing for authenticated seller and strict privacy
 * enforcement.
 *
 * 1. Register a seller to obtain authentication and sellerId.
 * 2. Complete onboarding (product creation and seller address setup).
 * 3. List sessions as authenticated seller and validate returned fields.
 * 4. Filter by date (created_after, created_before), filter by IP/href (basic
 *    check).
 * 5. Call unauthenticated and expect error.
 * 6. Call for a different sellerId and expect error.
 */
export async function test_api_seller_session_listing_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register seller (auto-authenticates)
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  TestValidator.predicate("seller is pending", sellerAuth.status === "pending");
  const sellerId = sellerAuth.id;

  // Step 2: Complete onboarding context (product + address)
  const productInput = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri: "https://example.com/image.png",
    status: "draft",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);
  TestValidator.equals(
    "product seller id matches",
    product.shopping_seller_id,
    sellerId,
  );

  const addressInput = {
    address_line1: "123 Business St.",
    address_line2: null,
    city: "Seoul",
    state: "Seoul",
    postal_code: "12345",
    country: "South Korea",
    is_primary: true,
    is_return_address: false,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(),
  } satisfies IShoppingSellerAddress.ICreate;
  const address = await api.functional.shopping.seller.sellers.addresses.create(
    connection,
    { sellerId, body: addressInput },
  );
  typia.assert(address);
  TestValidator.equals(
    "address sellerId matches",
    address.shopping_seller_id,
    sellerId,
  );

  // Step 3: List sessions (authenticated)
  const sessionList =
    await api.functional.shopping.seller.sellers.sessions.index(connection, {
      sellerId,
      body: {},
    });
  typia.assert(sessionList);
  TestValidator.equals(
    "output has seller sessions array",
    Array.isArray(sessionList.data),
    true,
  );

  // At least one session (the initial auth session from join)
  TestValidator.predicate("has initial session", sessionList.data.length >= 1);

  // Each session record has mandatory fields (creation, IP, etc.)
  sessionList.data.forEach((session, i) => {
    typia.assert(session);
    TestValidator.equals(
      `session #${i} sellerId`,
      session.shopping_seller_id,
      sellerId,
    );
    TestValidator.predicate(
      `session #${i} has id`,
      typeof session.id === "string" && !!session.id,
    );
    TestValidator.predicate(
      `session #${i} has ip`,
      typeof session.ip === "string" && !!session.ip,
    );
    TestValidator.predicate(
      `session #${i} has href`,
      typeof session.href === "string" && !!session.href,
    );
    TestValidator.predicate(
      `session #${i} has referrer`,
      typeof session.referrer === "string" && !!session.referrer,
    );
    TestValidator.predicate(
      `session #${i} has created_at`,
      typeof session.created_at === "string" && !!session.created_at,
    );
  });

  // Step 4: Filter by created_after/created_before (simulate simple date filter)
  if (sessionList.data.length > 0) {
    const first = sessionList.data[0];
    // created_before should return empty if before very first session
    const before = await api.functional.shopping.seller.sellers.sessions.index(
      connection,
      {
        sellerId,
        body: { created_before: first.created_at },
      },
    );
    typia.assert(before);
    TestValidator.equals("no sessions before first", before.data.length, 0);
    // created_after should exclude first if only one session
    const after = await api.functional.shopping.seller.sellers.sessions.index(
      connection,
      {
        sellerId,
        body: { created_after: first.created_at },
      },
    );
    typia.assert(after);
    // can't guarantee presence/absence, but run and check for API/contract compliance
    TestValidator.predicate(
      "created_after works",
      typeof after.data.length === "number",
    );
  }

  // Step 4b: Filtering by fake device/IP string yields empty
  const wildIp = "255.255.255.255";
  const badIp = await api.functional.shopping.seller.sellers.sessions.index(
    connection,
    {
      sellerId,
      body: { ip: wildIp },
    },
  );
  typia.assert(badIp);
  TestValidator.equals("bad IP filter yields empty", badIp.data.length, 0);

  // Step 5: Unauthenticated session listing fails
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "session listing fails unauthenticated",
    async () => {
      await api.functional.shopping.seller.sellers.sessions.index(
        unauthenticatedConn,
        {
          sellerId,
          body: {},
        },
      );
    },
  );

  // Step 6: Another sellerId privacy enforcement
  // Register a 2nd seller (will have own session only)
  const sellerInput2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: sellerInput2,
  });
  typia.assert(seller2);
  const otherSellerId = seller2.id;
  await TestValidator.error(
    "cannot access sessions of other sellerId",
    async () => {
      await api.functional.shopping.seller.sellers.sessions.index(connection, {
        sellerId: otherSellerId,
        body: {},
      });
    },
  );
}
