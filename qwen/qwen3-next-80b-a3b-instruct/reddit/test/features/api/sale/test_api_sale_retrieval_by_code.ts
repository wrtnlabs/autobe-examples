import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSale";
export async function test_api_sale_retrieval_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random sale code string for testing
  const saleCode = typia.random<string>();
  // Call the GET endpoint to retrieve sale details by code (no authentication required)
  const sale: ICommunityPlatformSale =
    await api.functional.communityPlatform.sales.at(connection, {
      saleCode: saleCode,
    });
  // Use typia.assert() to validate the complete response structure and all nested types
  // This performs perfect validation of all fields, nested objects, formats, and constraints
  typia.assert(sale);
}
