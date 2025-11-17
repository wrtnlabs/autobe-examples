import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";

export async function test_api_admin_mileage_deletion_by_authorized_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin actor joins the system and obtains authorization tokens
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // Step 2: Admin actor logs in to ensure valid session for subsequent calls
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoginAuthorized = await api.functional.auth.admin.login(
    connection,
    { body: adminLoginBody },
  );
  typia.assert(adminLoginAuthorized);

  // Step 3: Customer actor joins the system and obtains authorization tokens
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPass123!",
    href: "https://example.com/customer/join",
    referrer: "https://example.com/",
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    { body: customerJoinBody },
  );
  typia.assert(customerAuthorized);

  // Step 4: Customer actor logs in to ensure valid session
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    href: "https://example.com/customer/login",
    referrer: "https://example.com/",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoginAuthorized = await api.functional.auth.customer.login(
    connection,
    { body: customerLoginBody },
  );
  typia.assert(customerLoginAuthorized);

  // Step 5: Customer creates a mileage record
  const mileageCreateBody = {
    points: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    expiration_date: null,
  } satisfies IShoppingMallMileage.ICreate;
  const createdMileage =
    await api.functional.shoppingMall.customer.mileages.create(connection, {
      body: mileageCreateBody,
    });
  typia.assert(createdMileage);

  // Step 6: Switch back to admin actor login to set authorized admin context
  const adminLoginAuthorizedAgain = await api.functional.auth.admin.login(
    connection,
    { body: adminLoginBody },
  );
  typia.assert(adminLoginAuthorizedAgain);

  // Step 7: Admin deletes the customer mileage record by id
  await api.functional.shoppingMall.admin.mileages.erase(connection, {
    mileageId: createdMileage.id,
  });
}
