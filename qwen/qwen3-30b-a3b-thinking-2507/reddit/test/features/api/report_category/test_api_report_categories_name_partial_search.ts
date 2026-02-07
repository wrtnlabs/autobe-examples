import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_categories_name_partial_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get all report categories
  const allCategories =
    await api.functional.communityPlatform.report_categories.index(connection, {
      body: {} satisfies ICommunityPlatformReportCategory.IRequest,
    });
  typia.assert(allCategories);
  // 2. Filter categories for spam-related ones
  const spamCategories = allCategories.data.filter((category) =>
    category.name.toLowerCase().includes("spam"),
  );
  // 3. Validate search results
  TestValidator.predicate("Spam categories found", spamCategories.length > 0);
  TestValidator.equals("Spam categories count", spamCategories.length, 1);
}
