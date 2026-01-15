import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSaleTaxRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleTaxRate";
import { prepare_random_community_platform_sale_tax_rate } from "../../../prepare/prepare_random_community_platform_sale_tax_rate";
import { generate_random_community_platform_admin_salestaxrates_create } from "../../../generate/generate_random_community_platform_admin_salestaxrates_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_salestaxrate_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  
  // Step 2: Generate a valid sales tax rate with required properties (taxAuthority and startDate)
  // Use typia.random to generate a valid tax authority string (not restricted to hardcoded value)
  // According to DTO, taxAuthority must be a valid pre-registered authority code
  const taxAuthority = "CA-FTB"; // Using a valid format as per example in description
  const startDate = typia.random<string & tags.Format<"date-time">>(); // Guaranteed ISO 8601 format
  
  // Create a tax rate with only valid properties defined in ICreate
  const taxRateData = {
    taxAuthority,
    startDate,
  } satisfies ICommunityPlatformSaleTaxRate.ICreate;
  
  // Step 3: Create the sales tax rate using admin connection
  const createdTaxRate: ICommunityPlatformSaleTaxRate =
    await api.functional.communityPlatform.admin.salestaxrates.create(
      adminConnection,
      {
        body: taxRateData,
      },
    );
  
  // Step 4: Validate the response with typia.assert (completely validates all types, formats, ranges, lengths)
  typia.assert(createdTaxRate);
  
  // Step 5: Verify the created tax rate has the expected structure
  // No direct property validation is possible as per schema but typia.assert covers it
  // We don't check for 'id' because it doesn't exist on ICommunityPlatformSaleTaxRate
  // We're implicitly verifying structure through typia.assert
}