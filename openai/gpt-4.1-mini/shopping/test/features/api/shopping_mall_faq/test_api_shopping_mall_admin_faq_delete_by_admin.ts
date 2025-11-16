import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaq";

export async function test_api_shopping_mall_admin_faq_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registers (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "securePassword123!",
        phone_number: RandomGenerator.mobile(),
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Switch authentication context by logging in as the admin
  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123!",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Create a new FAQ entry as prerequisite
  //    Note: The creation API is under customer context, so authenticate as customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customerPassword123",
        full_name: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Login as customer to get session
  const loggedInCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: "customerPassword123",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(loggedInCustomer);

  // Create FAQ as customer
  const faqCreateBody = {
    question: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    answer: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies IShoppingMallFaq.ICreate;

  const createdFaq: IShoppingMallFaq =
    await api.functional.shoppingMall.customer.faqs.create(connection, {
      body: faqCreateBody,
    });
  typia.assert(createdFaq);

  // 4. Switch to admin auth context again (login to renew session)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "securePassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 5. Delete the created FAQ as admin
  await api.functional.shoppingMall.admin.faqs.erase(connection, {
    id: createdFaq.id,
  });
}
