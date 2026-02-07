import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_index_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Call with account_status = inactive
  const result: IPageIEcommerceCustomer.ISummary =
    await api.functional.ecommerce.customers.index(connection, {
      body: {
        account_status: "inactive",
        page: 1,
        limit: 12,
      } satisfies IEcommerceCustomer.IRequest,
    });
  typia.assert(result);
  // Validate empty data array
  TestValidator.equals("data array should be empty", result.data.length, 0);
  // Validate pagination metadata
  TestValidator.equals(
    "total records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals("total pages should be 0", result.pagination.pages, 0);
  TestValidator.equals(
    "current page should be default 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be default 12",
    result.pagination.limit,
    12,
  );
}
