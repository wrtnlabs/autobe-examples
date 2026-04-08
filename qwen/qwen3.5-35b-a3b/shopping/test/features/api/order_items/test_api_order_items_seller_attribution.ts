import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_order_items_seller_attribution(connection: api.IConnection): Promise<void> {
    // Register member A
    const memberA: IEcommerceMallMember.IAuthorized = await authorize_member_join(connection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123456",
            display_name: RandomGenerator.name(),
        },
    });
    typia.assert(memberA);
    const memberAConnection: api.IConnection = { host: connection.host };
    // Register member B
    const memberB: IEcommerceMallMember.IAuthorized = await authorize_member_join(connection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123456",
            display_name: RandomGenerator.name(),
        },
    });
    typia.assert(memberB);
    const memberBConnection: api.IConnection = { host: connection.host };
    // Create address for member A
    const memberAAddress: IEcommerceMallCustomerAddress = await generate_random_ecommerce_mall_member_customer_addresses_create(memberAConnection, {
        body: {
            recipient_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            street: RandomGenerator.alphabets(20),
            city: RandomGenerator.name(2),
            state: RandomGenerator.name(2),
            postal_code: RandomGenerator.alphaNumeric(5),
            country: "KR",
            is_default: true,
        },
    });
    typia.assert(memberAAddress);
    // Create address for member B
    const memberBAddress: IEcommerceMallCustomerAddress = await generate_random_ecommerce_mall_member_customer_addresses_create(memberBConnection, {
        body: {
            recipient_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            street: RandomGenerator.alphabets(20),
            city: RandomGenerator.name(2),
            state: RandomGenerator.name(2),
            postal_code: RandomGenerator.alphaNumeric(5),
            country: "KR",
            is_default: true,
        },
    });
    typia.assert(memberBAddress);
    // Member A creates an order
    const memberAOrder: IEcommerceMallOrder = await generate_random_ecommerce_mall_member_orders_create(memberAConnection, {
        body: undefined,
    });
    typia.assert(memberAOrder);
    // Member B creates an order
    const memberBOrder: IEcommerceMallOrder = await generate_random_ecommerce_mall_member_orders_create(memberBConnection, {
        body: undefined,
    });
    typia.assert(memberBOrder);
    // Member A queries their order items (no filter)
    const memberAOrderItems: IPageIEcommerceMallOrderItem.ISummary = await api.functional.ecommerceMall.member.order_items.index(memberAConnection, {
        body: {},
    });
    typia.assert(memberAOrderItems);
    // Verify member A only sees their own order items
    for (const item of memberAOrderItems.data) {
        TestValidator.equals("order_number matches", item.order_number, memberAOrder.order_number);
    }
    // Verify member A cannot see member B's order items
    const memberBItemsFound = memberAOrderItems.data.some(item => item.order_number === memberBOrder.order_number);
    TestValidator.equals("member B order items not visible to member A", memberBItemsFound, false);
    // Verify seller_display_name is populated
    for (const item of memberAOrderItems.data) {
        TestValidator.predicate("seller_display_name populated", item.seller_display_name.length > 0);
    }
    // Verify product_variant fields are populated
    for (const item of memberAOrderItems.data) {
        TestValidator.predicate("product_variant_name populated", item.product_variant_name.length > 0);
        TestValidator.predicate("product_variant_sku_code populated", item.product_variant_sku_code.length > 0);
        TestValidator.predicate("product_variant_price populated", item.product_variant_price > 0);
    }
    // Verify status values are valid
    for (const item of memberAOrderItems.data) {
        TestValidator.predicate("status is valid enum", [
            "paid",
            "shipped",
            "delivered",
            "cancelled",
            "refunded",
        ].includes(item.status));
    }
    // Test filtering by seller_id - filter should be ignored, member still sees own items only
    const testSellerId: string = memberB.id;
    const memberAWithSellerFilter: IPageIEcommerceMallOrderItem.ISummary = await api.functional.ecommerceMall.member.order_items.index(memberAConnection, {
        body: { seller_id: testSellerId },
    });
    typia.assert(memberAWithSellerFilter);
    for (const item of memberAWithSellerFilter.data) {
        TestValidator.equals("order_number matches with seller filter", item.order_number, memberAOrder.order_number);
    }
    // Member B should also only see their own items
    const memberBOrderItems: IPageIEcommerceMallOrderItem.ISummary = await api.functional.ecommerceMall.member.order_items.index(memberBConnection, {
        body: {},
    });
    typia.assert(memberBOrderItems);
    for (const item of memberBOrderItems.data) {
        TestValidator.equals("order_number matches for member B", item.order_number, memberBOrder.order_number);
    }
    // Verify member B cannot see member A's order items
    const memberAItemsFound = memberBOrderItems.data.some(item => item.order_number === memberAOrder.order_number);
    TestValidator.equals("member A order items not visible to member B", memberAItemsFound, false);
}