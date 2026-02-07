import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sellers_filter_by_email_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Use provided connection as admin connection (no login needed)
  const adminConnection: api.IConnection = connection;
  // 2. Generate test seller data with 'test' in email
  const testSellers = ArrayUtil.repeat(3, () => ({
    email: `${RandomGenerator.alphabets(4)}test${RandomGenerator.alphabets(5)}.com`,
    shopName: RandomGenerator.paragraph({ sentences: 1 }),
    status: "approved" as "pending" | "approved" | "rejected",
    lastUpdate: new Date().toISOString(),
  }));
  // 3. Search for sellers with partial email match "test"
  const searchResults = await api.functional.ecommerce.sellers.index(
    adminConnection,
    {
      body: {
        email: "test",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert<IPageIEcommerceSeller.ISummary>(searchResults);
  // 4. Verify matching sellers
  const matchingSellers = testSellers.filter((seller) =>
    seller.email.toLowerCase().includes("test"),
  );
  // Verify at least one matching seller was returned
  TestValidator.equals(
    "Should have at least one matching seller",
    matchingSellers.length > 0,
    true,
  );
  // Verify all matching sellers are included in results
  for (const seller of matchingSellers) {
    TestValidator.predicate(
      `Matching seller with email ${seller.email} should be included in results`,
      searchResults.data.some((result) => result.email === seller.email),
    );
  }
}
