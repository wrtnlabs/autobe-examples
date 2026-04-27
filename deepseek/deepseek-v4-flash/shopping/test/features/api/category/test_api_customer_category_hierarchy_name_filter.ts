import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_category_hierarchy_name_filter(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // Test the hierarchy search API with various name-based filters
  // Scenario A: Filter by subcategory name (case-insensitive partial match)
  const resultA =
    await api.functional.eCommerceMall.customer.categories.hierarchy.search(
      customerConnection,
      {
        body: {
          name: "phone",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(resultA);
  // Scenario B: Filter by top-level category name
  const resultB =
    await api.functional.eCommerceMall.customer.categories.hierarchy.search(
      customerConnection,
      {
        body: {
          name: "electronics",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(resultB);
  // Scenario C: Filter with no matching name
  const resultC =
    await api.functional.eCommerceMall.customer.categories.hierarchy.search(
      customerConnection,
      {
        body: {
          name: "xyz",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(resultC);
  // Validate no-match case returns empty array
  TestValidator.equals(
    "no match returns empty topLevelCategories",
    resultC.topLevelCategories,
    [],
  );
  // Scenario D: Test case-insensitive matching by using different casing
  const resultD =
    await api.functional.eCommerceMall.customer.categories.hierarchy.search(
      customerConnection,
      {
        body: {
          name: "PHONE",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(resultD);
  TestValidator.equals(
    "case-insensitive search (PHONE vs phone) returns same count",
    resultD.topLevelCategories.length,
    resultA.topLevelCategories.length,
  );
  // Scenario E: Retrieve full hierarchy without filter for baseline comparison
  const resultE =
    await api.functional.eCommerceMall.customer.categories.hierarchy.search(
      customerConnection,
      {
        body: {} satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(resultE);
  // Verify that filtered results are a subset (or equal to) the unfiltered hierarchy
  TestValidator.predicate(
    "filtered results are subset of unfiltered results",
    () =>
      resultA.topLevelCategories.length <= resultE.topLevelCategories.length,
  );
}
