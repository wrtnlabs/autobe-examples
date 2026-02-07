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

export async function test_api_report_categories_all_standard_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const output = await api.functional.communityPlatform.report_categories.index(
    connection,
    {
      body: typia.random<ICommunityPlatformReportCategory.IRequest>(),
    },
  );
  typia.assert(output);
  const expectedStandardCategories = [
    "Spam",
    "Inappropriate Content",
    "Copyright Violation",
  ];
  for (const categoryName of expectedStandardCategories) {
    TestValidator.predicate(
      `Category "${categoryName}" should exist in the list`,
      output.data.some(
        (cat: ICommunityPlatformReportCategory.ISummary) =>
          cat.name === categoryName,
      ),
    );
  }
  TestValidator.predicate(
    "Should have at least one report category",
    output.data.length > 0,
  );
  output.data.forEach(
    (cat: ICommunityPlatformReportCategory.ISummary, index) => {
      TestValidator.predicate(
        `Category ID at index ${index} should be a valid UUID`,
        true,
      );
      TestValidator.predicate(
        `Category at index ${index} created_at should be ISO 8601 format`,
        true,
      );
    },
  );
}
