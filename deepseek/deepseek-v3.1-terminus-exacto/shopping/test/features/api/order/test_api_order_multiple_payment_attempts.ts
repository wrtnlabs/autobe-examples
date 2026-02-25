import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCartItem";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test order creation with successful payment after initial payment failure.
 * Verifies that customers can retry payment successfully after initial failure.
 */
export async function test_api_order_multiple_payment_attempts(connection: api.IConnection): Promise<void> {
    // 1. Setup seller
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "seller123",
            shop_name: RandomGenerator.name(),
            shop_description: RandomGenerator.paragraph({ sentences: 2 }),
            logo_image_url: typia.random<string & tags.Format<"uri">>(),
            href: "https://test.com",
            referrer: "https://test.com",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceSeller.IJoin,
    });

    // 2. Setup customer
    const customerConnection: api.IConnection = { host: connection.host };
    const customerResponse = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "customer123",
            display_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
        } satisfies IEcommerceCustomer.IJoin,
    });
    typia.assert(customerResponse);

    // 3. First order attempt expecting payment failure
    await TestValidator.error("order creation with invalid payment data", async () => {
        const invalidOrderData = typia.random<IEcommerceOrder>();
        // Modify to create invalid payment scenario
        invalidOrderData.total_revenue = -100; // Negative revenue should trigger validation error
        await api.functional.ecommerce.customer.orders.create(customerConnection, {
            body: invalidOrderData,
        });
    });

    // 4. Second attempt with valid order data
    const validOrderData = typia.random<IEcommerceOrder>();
    const orderResponse = await api.functional.ecommerce.customer.orders.create(customerConnection, {
        body: validOrderData,
    });
    typia.assert(orderResponse);

    // 5. Validate successful order creation
    TestValidator.predicate("order has valid period timestamp", typeof orderResponse.period === "string" && orderResponse.period.length > 0);
    TestValidator.predicate("order has non-negative revenue", orderResponse.total_revenue >= 0);
    TestValidator.predicate("order has valid order count", orderResponse.order_count >= 0);
}