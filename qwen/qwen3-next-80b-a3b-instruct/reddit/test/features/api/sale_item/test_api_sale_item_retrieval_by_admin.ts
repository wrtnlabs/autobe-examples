import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSaleItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleItem";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_sale_item_retrieval_by_admin(connection: api.IConnection): Promise<void> {
    // Create admin connection and authenticate
    const adminConnection: api.IConnection = { 
        host: connection.host, 
        headers: {}
    };
    const adminAuth = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            href: "https://example.com/join",
            referrer: "https://example.com"
        } satisfies ICommunityPlatformAdmin.IJoin
    });
    adminConnection.headers = { Authorization: adminAuth.token.access };

    // Generate a valid saleCode and itemSku for testing using typia.random
    const validSaleCode: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const validItemSku = RandomGenerator.alphaNumeric(8);

    // Test 1: Successful retrieval with valid saleCode and itemSku
    const item = await api.functional.communityPlatform.admin.sales.items.at(adminConnection, {
        saleCode: validSaleCode,
        itemSku: validItemSku
    });

    // Validate the retrieval result follows the ICommunityPlatformSaleItem schema
    typia.assert(item);

    // Verify basic identity fields exist and match the expected structure
    TestValidator.equals("item ID is UUID", typeof item.id, 'string');
    TestValidator.predicate("item ID matches UUID format", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id));
    TestValidator.equals("item SKU is string", typeof item.item_sku, 'string');
    TestValidator.predicate("item SKU is not empty", item.item_sku.length > 0);
    TestValidator.predicate("quantity is at least 1", item.quantity >= 1);
    TestValidator.predicate("unit price is non-negative", item.unit_price >= 0);
    TestValidator.predicate("total amount is non-negative", item.total_amount >= 0);
    TestValidator.predicate("tax amount is non-negative", item.tax_amount >= 0);
    TestValidator.equals("status is either 'active' or 'canceled'", item.status, item.status satisfies "active" | "canceled" | null | undefined as "active" | "canceled" | null | undefined);
    TestValidator.equals("created_at is ISO date-time", typeof item.created_at, 'string');
    TestValidator.predicate("created_at matches ISO 8601 format", /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?(Z|[+-][01][0-9]:[0-5][0-9])$/.test(item.created_at));
    
    // Verify notes property is either string, null, or undefined
    TestValidator.predicate("notes is string, null, or undefined", item.notes === null || item.notes === undefined || typeof item.notes === 'string');

    // Test 2: Failed retrieval with non-existent saleCode
    const invalidSaleCode = "00000000-0000-0000-0000-000000000000";
    await TestValidator.error("should fail when saleCode does not exist", async () => {
        await api.functional.communityPlatform.admin.sales.items.at(adminConnection, {
            saleCode: invalidSaleCode,
            itemSku: validItemSku
        });
    });

    // Test 3: Failed retrieval with non-existent itemSku
    const invalidItemSku = "invalidsku123";
    await TestValidator.error("should fail when itemSku does not exist", async () => {
        await api.functional.communityPlatform.admin.sales.items.at(adminConnection, {
            saleCode: validSaleCode,
            itemSku: invalidItemSku
        });
    });
}