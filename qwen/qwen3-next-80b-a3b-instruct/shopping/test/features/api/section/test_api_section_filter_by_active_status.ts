import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
export async function test_api_section_filter_by_active_status(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for admin actions
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: isActive=true - should return only active sections
  const activeOnlyResponse = await api.functional.shoppingMall.sections.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        isActive: true,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(activeOnlyResponse);
  // Check that response has data
  TestValidator.predicate(
    "active sections response has data",
    activeOnlyResponse.data.length > 0,
  );
  // Validate that all returned sections have is_active = true
  for (const section of activeOnlyResponse.data) {
    TestValidator.predicate(
      "all active sections are actually active",
      section.is_active,
    );
  }
  // Test 2: isActive=false - should return only inactive sections
  const inactiveOnlyResponse = await api.functional.shoppingMall.sections.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        isActive: false,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(inactiveOnlyResponse);
  // Check that response has data
  TestValidator.predicate(
    "inactive sections response has data",
    inactiveOnlyResponse.data.length > 0,
  );
  // Validate that all returned sections have is_active = false
  for (const section of inactiveOnlyResponse.data) {
    TestValidator.predicate(
      "all inactive sections are actually inactive",
      !section.is_active,
    );
  }
  // Test 3: isActive omitted - should return all sections
  const allSectionsResponse = await api.functional.shoppingMall.sections.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(allSectionsResponse);
  // Check that response has data
  TestValidator.predicate(
    "all sections response has data",
    allSectionsResponse.data.length > 0,
  );
  // Validate that the total sections includes both active and inactive
  const activeCount = allSectionsResponse.data.filter(
    (s) => s.is_active,
  ).length;
  const inactiveCount = allSectionsResponse.data.filter(
    (s) => !s.is_active,
  ).length;
  TestValidator.predicate("contains active sections", activeCount > 0);
  TestValidator.predicate("contains inactive sections", inactiveCount > 0);
  TestValidator.equals(
    "total sections count matches sum",
    allSectionsResponse.data.length,
    activeCount + inactiveCount,
  );
}
