import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_category_analytics_administrator_comprehensive_overview(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register administrator account using utility function
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!" satisfies string &
        tags.Format<"password"> as string & tags.Format<"password">,
    },
  });
  typia.assert(adminAuth);
  // Test 1: Basic analytics with pagination
  const analyticsRequest1: IEcommerceCategory.IRequest = {
    page: 1,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    metric_types: ["sales", "products", "engagement", "performance"] as const,
  };
  const analytics1 =
    await api.functional.ecommerce.administrator.category_analytics.index(
      adminConnection,
      {
        body: analyticsRequest1,
      },
    );
  typia.assert(analytics1);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    analytics1.pagination.current,
    1,
  );
  TestValidator.equals("pagination has limit", analytics1.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    analytics1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    analytics1.pagination.pages >= 0,
  );
  // Validate category data structure
  TestValidator.predicate("data is array", Array.isArray(analytics1.data));
  if (analytics1.data.length > 0) {
    const category = analytics1.data[0];
    typia.assert(category);
    TestValidator.predicate("category has ID", typeof category.id === "string");
    TestValidator.predicate(
      "category has name",
      typeof category.name === "string",
    );
    TestValidator.predicate(
      "category has products_count",
      typeof category.products_count === "number",
    );
    // Parent can be null or ISummary object
    if (category.parent !== null) {
      typia.assert(category.parent);
      TestValidator.predicate(
        "parent has ID",
        typeof category.parent.id === "string",
      );
      TestValidator.predicate(
        "parent has name",
        typeof category.parent.name === "string",
      );
    }
  }
  // Test 2: Pagination with different parameters
  const analyticsRequest2: IEcommerceCategory.IRequest = {
    page: 2,
    limit: 5 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const analytics2 =
    await api.functional.ecommerce.administrator.category_analytics.index(
      adminConnection,
      {
        body: analyticsRequest2,
      },
    );
  typia.assert(analytics2);
  TestValidator.equals("second page current", analytics2.pagination.current, 2);
  TestValidator.equals("second page limit", analytics2.pagination.limit, 5);
  // Test 3: Filtering with date range only
  const analyticsRequest3: IEcommerceCategory.IRequest = {
    page: 1,
    limit: 20 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
  };
  const analytics3 =
    await api.functional.ecommerce.administrator.category_analytics.index(
      adminConnection,
      {
        body: analyticsRequest3,
      },
    );
  typia.assert(analytics3);
  // Test 4: Specific metric types
  const analyticsRequest4: IEcommerceCategory.IRequest = {
    page: 1,
    limit: 15 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    metric_types: ["sales", "products"] as const,
  };
  const analytics4 =
    await api.functional.ecommerce.administrator.category_analytics.index(
      adminConnection,
      {
        body: analyticsRequest4,
      },
    );
  typia.assert(analytics4);
  // Test 5: Maximum limit (100)
  const analyticsRequest5: IEcommerceCategory.IRequest = {
    page: 1,
    limit: 100 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const analytics5 =
    await api.functional.ecommerce.administrator.category_analytics.index(
      adminConnection,
      {
        body: analyticsRequest5,
      },
    );
  typia.assert(analytics5);
  TestValidator.equals(
    "maximum limit enforced",
    analytics5.pagination.limit,
    100,
  );
  // Test 6: With category IDs (if we had some)
  const categoryIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const analyticsRequest6: IEcommerceCategory.IRequest = {
    page: 1,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    category_ids: categoryIds,
  };
  const analytics6 =
    await api.functional.ecommerce.administrator.category_analytics.index(
      adminConnection,
      {
        body: analyticsRequest6,
      },
    );
  typia.assert(analytics6);
}
