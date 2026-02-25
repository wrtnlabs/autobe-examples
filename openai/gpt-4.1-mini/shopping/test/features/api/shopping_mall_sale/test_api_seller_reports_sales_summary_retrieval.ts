import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_reports_sales_summary_retrieval(connection: api.IConnection): Promise<void> {
    // 1. Authenticate seller by join
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "Password123!",
            shopName: "Test Shop",
            shopDescription: "Test description",
            logoUri: null,
        },
    });
    typia.assert(sellerAuth);

    // Attach authorization token header
    sellerConnection.headers = {
        Authorization: `Bearer ${sellerAuth.token.access}`,
    };

    // 2. Perform GET /shoppingMall/seller/reports/sales
    const rawSalesReports = await api.functional.shoppingMall.seller.reports.sales.salesReport(sellerConnection);
    const salesReports: Array<IShoppingMallSale.ISummary> = typia.assert<Array<IShoppingMallSale.ISummary>>(rawSalesReports);

    // 3. Validate each sales summary
    for (let i = 0; i < salesReports.length; ++i) {
        const report = salesReports[i];
        typia.assert<IShoppingMallSale.ISummary>(report);

        // deletedAt must be null/undefined (not logically deleted)
        TestValidator.predicate("deletedAt is null", report.deletedAt === null || report.deletedAt === undefined);

        // Seller in report must be the authenticated seller
        TestValidator.equals("seller id matches authenticated", report.seller.id, sellerAuth.id);
        TestValidator.equals("seller email matches authenticated", report.seller.email, sellerAuth.email);
        TestValidator.equals("seller shopName matches authenticated", report.seller.shopName, sellerAuth.shopName);

        // Check required fields
        TestValidator.predicate("valid id", typeof report.id === "string");
        TestValidator.predicate("valid name", typeof report.name === "string");
        TestValidator.predicate("valid basePrice", report.basePrice >= 0);
        TestValidator.predicate("valid status", typeof report.status === "string");
        TestValidator.predicate(
            "valid timestamps",
            typeof report.createdAt === "string" && typeof report.updatedAt === "string"
        );

        // Presence of category summary
        typia.assert<IShoppingMallProductCategory.ISummary>(report.category);

        // Validate timestamps format as ISO 8601
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
        TestValidator.predicate("createdAt is ISO string", typeof report.createdAt === "string" && isoRegex.test(report.createdAt));
        TestValidator.predicate("updatedAt is ISO string", typeof report.updatedAt === "string" && isoRegex.test(report.updatedAt));
    }
}
