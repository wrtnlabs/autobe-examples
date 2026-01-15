import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformOrderTaxCalculation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderTaxCalculation";
import type { ICommunityPlatformOrderTaxCalculationDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderTaxCalculationDetail";
import type { ICommunityPlatformOrderTaxCalculationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderTaxCalculationMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_tax_calculation_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: adminCreds });
  typia.assert(adminAuth);
  // Step 2: Create a test order and tax calculation
  // We need an existing tax calculation to update, but there's no way to create one via the API
  // So we'll use randomly generated UUIDs for orderId and taxId that should be valid
  const orderId: string = typia.random<string & tags.Format<"uuid">>();
  const taxId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Prepare valid update data
  const updateData: ICommunityPlatformOrderTaxCalculation.IUpdate = {
    taxRate: 0.08, // 8% tax rate within [0,1] constraint
    taxableAmount: 1000, // Non-negative taxable amount
    taxJurisdiction: "US-CA", // Valid jurisdiction format (two-letter country, optional state)
    taxType: "sales", // Valid tax type from enum
    taxCalculationMethod: "flat_rate", // Valid calculation method
    calculationTimestamp: new Date().toISOString(), // Must be ISO date-time format
    currencyCode: "USD", // Must match currency of the order
    taxRoundingMethod: "round_half_up", // Required rounding method
  } satisfies ICommunityPlatformOrderTaxCalculation.IUpdate;
  // Step 4: Perform the update using admin connection
  const updatedCalculation: ICommunityPlatformOrderTaxCalculation =
    await api.functional.communityPlatform.admin.orders.tax_calculations.update(
      adminConnection,
      {
        orderId: orderId,
        taxId: taxId,
        body: updateData,
      },
    );
  typia.assert(updatedCalculation);
  // Step 5: Validate the update - only validate properties that exist in the response
  TestValidator.equals(
    "tax rate updated",
    updatedCalculation.tax_rate,
    updateData.taxRate,
  );
  TestValidator.equals(
    "taxable amount updated",
    updatedCalculation.taxable_amount,
    updateData.taxableAmount,
  );
  TestValidator.equals(
    "jurisdiction updated",
    updatedCalculation.jurisdiction,
    updateData.taxJurisdiction,
  );
  TestValidator.equals(
    "tax type updated",
    updatedCalculation.tax_type,
    updateData.taxType,
  );
  TestValidator.equals(
    "calculation method updated",
    updatedCalculation.calculation_method,
    updateData.taxCalculationMethod,
  );
  TestValidator.equals(
    "currency code updated",
    updatedCalculation.currency,
    updateData.currencyCode,
  );
  // Note: taxRoundingMethod is only a request parameter and not present in response
  // Note: updated_at is not a property in ICommunityPlatformOrderTaxCalculation
  // Validate that tax_amount equals taxable_amount * tax_rate (with rounding)
  const expectedTaxAmount =
    Math.round(updateData.taxableAmount * updateData.taxRate * 100) / 100;
  TestValidator.equals(
    "tax amount recalculated correctly",
    updatedCalculation.tax_amount,
    expectedTaxAmount,
  );
  // Validate that created_at (which represents the last update time) was updated
  // The calculationTimestamp from the request should be reflected in the created_at field
  // as it represents the time of the most recent calculation
  const inputTimestamp = new Date(updateData.calculationTimestamp).getTime();
  const updatedTimestamp = new Date(updatedCalculation.created_at).getTime();
  TestValidator.predicate(
    "creation timestamp updated to reflect calculation timestamp",
    updatedTimestamp >= inputTimestamp,
  );
  // Ensure the source is admin_override as expected for admin updates
  TestValidator.equals(
    "source should be admin_override",
    updatedCalculation.source,
    "admin_override",
  );
}
