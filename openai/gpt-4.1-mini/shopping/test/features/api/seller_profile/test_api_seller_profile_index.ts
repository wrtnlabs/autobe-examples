import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_seller_profile_index(
  connection: api.IConnection,
) {
  // 1. Create a seller account and profile
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "TestPass123!",
      store_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Create seller profile for the seller
  const sellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        store_name: seller.store_name,
        business_registration_number: RandomGenerator.alphaNumeric(10),
        contact_email: seller.email,
        contact_phone: RandomGenerator.mobile(),
        profile_description: RandomGenerator.paragraph({ sentences: 6 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IShoppingMallSellerProfile.ICreate,
    });
  typia.assert(sellerProfile);

  // 3. Create admin user for accessing seller profile
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 4. Assign admin role to the new admin user
  const userRole = await api.functional.shoppingMall.admin.userRoles.create(
    connection,
    {
      body: {
        user_id: admin.id,
        role_name: "admin",
      } satisfies IShoppingMallUserRole.ICreate,
    },
  );
  typia.assert(userRole);

  // 5. Login as admin for role-based access
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      ip: null,
      href: "https://test.admin.com/dashboard",
      referrer: "https://test.admin.com/login",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 6. Login as seller (simulate real-world multi-actor)
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "TestPass123!",
      ip: null,
      href: "https://test.seller.com/profile",
      referrer: "https://test.seller.com/login",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);

  // 7. Query seller profiles list as admin with filtering and pagination
  const filterName = sellerProfile.store_name.substring(0, 3);
  const filterEmail = sellerProfile.contact_email.substring(0, 3);
  const page1 = await api.functional.shoppingMall.admin.sellerProfiles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: filterName,
        sort_by: "store_name",
        sort_order: "asc",
      } satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    `page1 contains at least 1 seller profile with store_name includes ${filterName}`,
    page1.data.some((profile) => profile.store_name.includes(filterName)),
  );

  // 8. Query seller profiles list with filtering on contact_email
  const page2 = await api.functional.shoppingMall.admin.sellerProfiles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: filterEmail,
        sort_by: "contact_email",
        sort_order: "asc",
      } satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.predicate(
    `page2 contains at least 1 seller profile with contact_email includes ${filterEmail}`,
    page2.data.some((profile) => profile.contact_email.includes(filterEmail)),
  );

  // 9. Validate pagination correctness
  if (page1.pagination.pages > 1) {
    const page2result =
      await api.functional.shoppingMall.admin.sellerProfiles.index(connection, {
        body: {
          page: 2,
          limit: 10,
          search: filterName,
          sort_by: "store_name",
          sort_order: "asc",
        } satisfies IShoppingMallSellerProfile.IRequest,
      });
    typia.assert(page2result);
    TestValidator.predicate(
      "page2 data distinct from page1",
      !page2result.data.some((profile) =>
        page1.data.some((p1) => p1.id === profile.id),
      ),
    );
  }

  // 10. Verify data integrity for a sample profile
  if (page1.data.length > 0) {
    const sample = page1.data[0];
    TestValidator.predicate(
      "sample has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        sample.id,
      ),
    );
    TestValidator.predicate(
      "sample store_name non-empty",
      typeof sample.store_name === "string" && sample.store_name.length > 0,
    );
    TestValidator.predicate(
      "sample contact_email valid format",
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sample.contact_email),
    );
  }
}
