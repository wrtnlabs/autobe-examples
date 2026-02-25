import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { prepare_random_shopping_mall_shipment_order_item } from "../../../prepare/prepare_random_shopping_mall_shipment_order_item";
import { generate_random_shopping_mall_seller_shipment_order_items_create } from "../../../generate/generate_random_shopping_mall_seller_shipment_order_items_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

function generateRandomEmail(): string & tags.Format<"email"> {
    // generate a simple random email string and cast properly
    const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
    return email satisfies string & tags.Format<"email"> as string & tags.Format<"email">;
}

export async function test_api_shipment_order_item_creation_success(connection: api.IConnection): Promise<void> {
    /**
     * Test scenario: Successful creation of shipment order item linkage by an authenticated seller.
     *
     * Steps:
     * 1. Seller joins (registers) and obtains authorization.
     * 2. Using the authorized seller connection, create a shipment order item linking shipment and order item.
     * 3. Assert the response correctness including created linkage and timestamps.
     */
    // Create seller connection and authorize join
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuthorized = await authorize_seller_join(sellerConnection, {
        body: {
            email: generateRandomEmail(),
            password: RandomGenerator.alphaNumeric(16),
            shopName: RandomGenerator.name(),
            shopDescription: null,
            logoUri: null,
        },
    });
    // Update connection headers with authorized token
    sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
    // Generate a new shipment order item linkage using utility
    const linkage = await generate_random_shopping_mall_seller_shipment_order_items_create(sellerConnection, { body: {} });
    // Assert returned linkage type and properties
    typia.assert(linkage);
    // Validate the id is UUID string
    TestValidator.predicate("shipment order item id is uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(linkage.id));
    // Validate shipment order item linkage fields
    TestValidator.equals("shipment id matches", linkage.shoppingMallShipmentId, linkage.shipment.id);
    TestValidator.equals("order item id matches", linkage.shoppingMallOrderItemId, linkage.orderItem.id);
    // Validate timestamps
    TestValidator.predicate("createdAt ISO string check", typeof linkage.createdAt === "string" && linkage.createdAt.length > 0);
    TestValidator.predicate("updatedAt ISO string check", typeof linkage.updatedAt === "string" && linkage.updatedAt.length > 0);
    TestValidator.equals("deletedAt is null", linkage.deletedAt, null);
    // Validate nested shipment summary
    typia.assert(linkage.shipment);
    TestValidator.predicate("shipment seller id is uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(linkage.shipment.seller.id));
    // Validate nested order item summary
    typia.assert(linkage.orderItem);
    TestValidator.predicate("order item order id is uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(linkage.orderItem.order.id));
    // The linkage is confirmed to be associated with given shipment and order item uniquely
}
