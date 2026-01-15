import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShippingCarrierComparisonItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShippingCarrierComparisonItem";
import type { IShippingStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShippingStatusDistribution";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAlert";
import type { IShoppingMallComprehensiveShippingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComprehensiveShippingReport";
import type { IShoppingMallDeliveryTimelineStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryTimelineStats";
import type { IShoppingMallRegionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSummary";
import type { IShoppingMallShippingCarrierPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrierPerformance";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comprehensive_shipping_report_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Call comprehensive shipping report endpoint
  const report =
    await api.functional.shoppingMall.admin.reports.shippings.comprehensive.index(
      adminConnection,
    );
  typia.assert(report);
}
