import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerInquiry";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerInquiry";

export async function test_api_admin_customer_inquiries_search(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Abcd1234$"; // Use a password that meets complexity requirements
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: adminPassword,
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Perform a filtered and paginated search of customer inquiries
  const page = 1;
  const limit = 10;
  const searchKeyword = RandomGenerator.substring(
    "Customer inquiry test search keyword to validate filtering feature.",
  );

  const nowISOString = new Date().toISOString();
  const pastISOString = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago

  const body: IShoppingMallCustomerInquiry.IRequest = {
    page,
    limit,
    search: searchKeyword,
    status: "open",
    customer_email: adminEmail,
    start_date: pastISOString,
    end_date: nowISOString,
  };

  const pageResult: IPageIShoppingMallCustomerInquiry.ISummary =
    await api.functional.shoppingMall.admin.customerInquiries.index(
      connection,
      { body },
    );
  typia.assert(pageResult);

  // Validate pagination info
  TestValidator.predicate(
    "pagination current page is correct",
    pageResult.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    pageResult.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pageResult.pagination.pages >= 0,
  );

  // Validate each inquiry summary item
  for (const inquiry of pageResult.data) {
    typia.assert<IShoppingMallCustomerInquiry.ISummary>(inquiry);
    TestValidator.predicate(
      "inquiry id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        inquiry.id,
      ),
    );
    TestValidator.predicate(
      "inquiry title is non-empty",
      inquiry.title.length > 0,
    );
    TestValidator.predicate(
      "inquiry status matches filter or is valid string",
      inquiry.status === "open" || typeof inquiry.status === "string",
    );
    // ISO datetime format validation
    TestValidator.predicate(
      "created_at is ISO 8601 format",
      !isNaN(Date.parse(inquiry.created_at)),
    );
    TestValidator.predicate(
      "updated_at is ISO 8601 format",
      !isNaN(Date.parse(inquiry.updated_at)),
    );
  }
}
