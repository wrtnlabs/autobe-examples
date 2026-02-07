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

export async function test_api_customer_index_pagination(
  connection: IConnection,
): Promise<void> {
  const output = await api.functional.ecommerce.customers.index(connection, {
    body: { page: 2, limit: 10 },
  });
  typia.assert(output);
  TestValidator.equals("current page", output.pagination.current, 2);
  TestValidator.equals("limit", output.pagination.limit, 10);
  TestValidator.predicate("total records > 20", output.pagination.records > 20);
}
