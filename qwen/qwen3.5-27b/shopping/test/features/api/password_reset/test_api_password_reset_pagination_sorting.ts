import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test pagination and sorting capabilities for password reset listing endpoint.
 *
 * Validates the complete pagination and sorting functionality of the password reset listing API. The test authenticates as a customer and performs multiple requests with different pagination parameters (page, pageSize) and sorting options (sortBy, sortOrder) to ensure correct behavior.
 *
 * Special attention is given to verifying pagination metadata accuracy, boundary conditions (empty results beyond total pages), and sorting correctness across multiple fields (created_at, user_email, id, user_type).
 *
 * 1. Authenticate as customer to access password reset listing endpoint
 * 2. Test default pagination (pageSize defaults to 100)
 * 3. Test custom pageSize (request pageSize=10)
 * 4. Test page navigation (page=1, page=2, page=3)
 * 5. Test boundary conditions (page beyond total pages)
 * 6. Test sorting by created_at ascending and descending
 * 7. Test sorting by user_email alphabetically
 * 8. Test sorting by id (UUID)
 * 9. Test sorting by user_type
 * 10. Verify pagination metadata accuracy throughout
 */
export async function test_api_password_reset_pagination_sorting(
  connection: api.IConnection,
) {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test default pagination (pageSize defaults to 100)
  const defaultPagination =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(defaultPagination);
  TestValidator.equals(
    "default limit is 100",
    defaultPagination.pagination.limit,
    100,
  );
  TestValidator.equals(
    "default page is 1",
    defaultPagination.pagination.current,
    1,
  );
  // 3. Test custom pageSize (request pageSize=10)
  const customPageSize =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          pageSize: 10,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(customPageSize);
  TestValidator.equals(
    "custom pageSize is 10",
    customPageSize.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length matches limit or total records",
    customPageSize.data.length <= 10,
  );
  // 4. Test page navigation (page=1, page=2, page=3)
  const page1 =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          page: 1,
          pageSize: 5,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  const page2 =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          page: 2,
          pageSize: 5,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  const page3 =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          page: 3,
          pageSize: 5,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(page3);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  // 5. Test boundary conditions (page beyond total pages)
  const beyondPages =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          page: 9999,
          pageSize: 10,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(beyondPages);
  TestValidator.equals(
    "beyond pages returns empty data",
    beyondPages.data.length,
    0,
  );
  TestValidator.equals(
    "beyond pages current matches request",
    beyondPages.pagination.current,
    9999,
  );
  // 6. Test sorting by created_at ascending and descending
  const createdAtAsc =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(createdAtAsc);
  if (createdAtAsc.data.length > 1) {
    TestValidator.predicate(
      "created_at ascending order",
      createdAtAsc.data.every((item, index, array) => {
        if (index === 0) return true;
        return (
          new Date(item.created_at) >= new Date(array[index - 1].created_at)
        );
      }),
    );
  }
  const createdAtDesc =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(createdAtDesc);
  if (createdAtDesc.data.length > 1) {
    TestValidator.predicate(
      "created_at descending order",
      createdAtDesc.data.every((item, index, array) => {
        if (index === 0) return true;
        return (
          new Date(item.created_at) <= new Date(array[index - 1].created_at)
        );
      }),
    );
  }
  // 7. Test sorting by user_email alphabetically
  const userEmailAsc =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          sortBy: "user_email",
          sortOrder: "asc",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(userEmailAsc);
  if (userEmailAsc.data.length > 1) {
    TestValidator.predicate(
      "user_email ascending order",
      userEmailAsc.data.every((item, index, array) => {
        if (index === 0) return true;
        return item.user_email >= array[index - 1].user_email;
      }),
    );
  }
  // 8. Test sorting by id (UUID)
  const idAsc =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          sortBy: "id",
          sortOrder: "asc",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(idAsc);
  if (idAsc.data.length > 1) {
    TestValidator.predicate(
      "id ascending order",
      idAsc.data.every((item, index, array) => {
        if (index === 0) return true;
        return item.id >= array[index - 1].id;
      }),
    );
  }
  // 9. Test sorting by user_type
  const userTypeAsc =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          sortBy: "user_type",
          sortOrder: "asc",
          pageSize: 100,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(userTypeAsc);
  if (userTypeAsc.data.length > 1) {
    TestValidator.predicate(
      "user_type ascending order",
      userTypeAsc.data.every((item, index, array) => {
        if (index === 0) return true;
        return item.user_type >= array[index - 1].user_type;
      }),
    );
  }
  // 10. Verify pagination metadata accuracy
  const metadataTest =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          page: 2,
          pageSize: 25,
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(metadataTest);
  TestValidator.equals(
    "current page matches request",
    metadataTest.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit matches pageSize",
    metadataTest.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    metadataTest.pagination.pages ===
      Math.ceil(
        metadataTest.pagination.records / metadataTest.pagination.limit,
      ),
  );
}
