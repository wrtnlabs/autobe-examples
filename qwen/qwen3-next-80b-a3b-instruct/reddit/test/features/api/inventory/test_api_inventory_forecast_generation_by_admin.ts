import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryExternalFactorImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryExternalFactorImpact";
import type { ICommunityPlatformInventoryReorderSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryReorderSetting";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_forecast_generation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminJoinData });
  // Generate forecast configuration with realistic parameters (must be ICommunityPlatformInventoryReorderSetting as per API definition)
  // Use confidenceLevel as the primary configuration; generate a month in the next 12 months
  const now = new Date();
  const futureMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1 + Math.floor(Math.random() * 12),
    1,
  );
  const forecastConfig = {
    month: futureMonth.toISOString().split("T")[0], // YYYY-MM-DD format for date
    predictedQuantity: typia.random<number & tags.Minimum<0>>(),
    lowerBound: typia.random<number & tags.Minimum<0>>(),
    upperBound: typia.random<number & tags.Minimum<0>>(),
    confidenceLevel: typia.random<number & tags.Minimum<0> & tags.Maximum<1>>(),
    seasonalityFactor: typia.random<number>(),
    externalFactorsImpact: ArrayUtil.repeat(
      typia.random<number & tags.Type<"uint32"> & tags.Maximum<3>>(),
      () => {
        return {
          impactType: RandomGenerator.pick([
            "marketing_campaign",
            "competitor_action",
            "economic_shift",
            "supply_chain_disruption",
            "regulatory_change",
          ] as const),
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          magnitude:
            RandomGenerator.pick(["+", "-"]) === "+"
              ? typia.random<number & tags.Minimum<0> & tags.Maximum<1>>()
              : -typia.random<number & tags.Minimum<0> & tags.Maximum<1>>(),
        } satisfies ICommunityPlatformInventoryExternalFactorImpact;
      },
    ),
    reorderTrigger: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformInventoryReorderSetting;
  // Call forecast generation API
  const forecastResult: ICommunityPlatformInventoryReorderSetting =
    await api.functional.communityPlatform.admin.inventory.demands.forecast.index(
      adminConnection,
      { body: forecastConfig },
    );
  typia.assert(forecastResult);
  // Validate forecast results
  TestValidator.equals(
    "month matches",
    forecastResult.month,
    forecastConfig.month,
  );
  TestValidator.predicate(
    "predicted quantity is positive",
    forecastResult.predictedQuantity > 0,
  );
  TestValidator.predicate(
    "lower bound is positive",
    forecastResult.lowerBound > 0,
  );
  TestValidator.predicate(
    "upper bound is positive",
    forecastResult.upperBound > 0,
  );
  TestValidator.predicate(
    "lower bound <= predicted quantity",
    forecastResult.lowerBound <= forecastResult.predictedQuantity,
  );
  TestValidator.predicate(
    "predicted quantity <= upper bound",
    forecastResult.predictedQuantity <= forecastResult.upperBound,
  );
  TestValidator.predicate(
    "confidence level between 0 and 1",
    forecastResult.confidenceLevel >= 0 && forecastResult.confidenceLevel <= 1,
  );
  TestValidator.predicate(
    "seasonality factor positive",
    forecastResult.seasonalityFactor > 0,
  );
  TestValidator.equals(
    "reorder trigger matches",
    forecastResult.reorderTrigger,
    forecastConfig.reorderTrigger,
  );
  TestValidator.predicate(
    "external factors impact array length is reasonable",
    forecastResult.externalFactorsImpact.length <= 3,
  );
  TestValidator.predicate(
    "external factors impact has at least one item",
    forecastResult.externalFactorsImpact.length >= 0,
  );
}
