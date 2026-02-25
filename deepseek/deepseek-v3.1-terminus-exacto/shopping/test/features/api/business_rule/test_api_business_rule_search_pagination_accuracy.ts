import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_business_rules_create } from "../../../generate/generate_random_ecommerce_administrator_business_rules_create";
import { prepare_random_ecommerce_platform_event_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_event_of_customer";

export async function test_api_business_rule_search_pagination_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup with utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Generate at least 100+ business rules for pagination
  const totalRules = 105; // More than 100 to test proper pagination
  const createdRules: IEcommercePlatformEventOfCustomer[] = [];
  for (let i = 0; i < totalRules; i++) {
    const rule =
      await generate_random_ecommerce_administrator_business_rules_create(
        adminConnection,
        {
          body: {
            rule_code: `RULE_${i}_${Date.now()}`,
            rule_name: RandomGenerator.paragraph({ sentences: 2 }),
            rule_description: RandomGenerator.paragraph({ sentences: 3 }),
            rule_type: RandomGenerator.pick([
              "validation",
              "workflow",
              "calculation",
              "restriction",
            ] as const),
            configuration_json: JSON.stringify({ enabled: true, priority: i }),
            is_active: Math.random() > 0.5,
            execution_order: i,
            version: "1.0.0",
          } satisfies IEcommercePlatformEventOfCustomer.ICreate,
        },
      );
    typia.assert(rule);
    createdRules.push(rule);
  }
  // 3. Test basic pagination with default parameters
  const firstPage =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1 satisfies number,
  );
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    10 satisfies number,
  );
  TestValidator.equals(
    "first page total records",
    firstPage.pagination.records,
    totalRules satisfies number,
  );
  TestValidator.equals(
    "first page total pages",
    firstPage.pagination.pages,
    Math.ceil(totalRules / 10) satisfies number,
  );
  TestValidator.equals(
    "first page data count",
    firstPage.data.length,
    10 satisfies number,
  );
  // 4. Test different page sizes (limit variations)
  const pageSizes = [1, 5, 20, 50, 100]; // Test from minimum to maximum
  for (const limit of pageSizes) {
    const pageResponse =
      await api.functional.ecommerce.administrator.business_rules.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IEcommercePlatformEventOfCustomer.IRequest,
        },
      );
    typia.assert(pageResponse);
    TestValidator.equals(
      `page limit ${limit} correct`,
      pageResponse.pagination.limit,
      limit satisfies number,
    );
    TestValidator.equals(
      `page total records ${limit} consistent`,
      pageResponse.pagination.records,
      totalRules satisfies number,
    );
    TestValidator.predicate(
      `page data length ${limit} within limit`,
      pageResponse.data.length <= limit,
    );
  }
  // 5. Test page navigation
  const limit = 10;
  const totalPages = Math.ceil(totalRules / limit);
  for (let page = 1; page <= totalPages; page++) {
    const response =
      await api.functional.ecommerce.administrator.business_rules.index(
        adminConnection,
        {
          body: {
            page: page satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IEcommercePlatformEventOfCustomer.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `page ${page} current correct`,
      response.pagination.current,
      page satisfies number,
    );
    TestValidator.predicate(
      `page ${page} data length valid`,
      response.data.length > 0 && response.data.length <= limit,
    );
    if (page === totalPages) {
      // Last page may have fewer items
      const expectedLastPageCount = totalRules % limit || limit;
      TestValidator.equals(
        `last page data count correct`,
        response.data.length,
        expectedLastPageCount satisfies number,
      );
    }
  }
  // 6. Test pages beyond available data (should return empty data but correct metadata)
  const beyondPage = totalPages + 1;
  const beyondResponse =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          page: beyondPage satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 10,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(beyondResponse);
  TestValidator.equals(
    "beyond page current correct",
    beyondResponse.pagination.current,
    beyondPage satisfies number,
  );
  TestValidator.equals(
    "beyond page data empty",
    beyondResponse.data.length,
    0 satisfies number,
  );
  TestValidator.equals(
    "beyond page total records consistent",
    beyondResponse.pagination.records,
    totalRules satisfies number,
  );
  // 7. Test page=0 (should default to page=1)
  const pageZeroResponse =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          page: 0 as unknown as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(pageZeroResponse);
  TestValidator.predicate(
    "page 0 defaults to page 1",
    pageZeroResponse.pagination.current === 1,
  );
  // 8. Test empty result set with filter
  const emptyResponse =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          search: "NONEXISTENT_RULE_CODE_XYZ",
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty search data empty",
    emptyResponse.data.length,
    0 satisfies number,
  );
  TestValidator.equals(
    "empty search total records 0",
    emptyResponse.pagination.records,
    0 satisfies number,
  );
  TestValidator.equals(
    "empty search total pages 0",
    emptyResponse.pagination.pages,
    0 satisfies number,
  );
}
