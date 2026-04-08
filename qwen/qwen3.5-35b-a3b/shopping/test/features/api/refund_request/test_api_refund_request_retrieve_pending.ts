import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Register and authenticate a new member for E2E testing.
 *
 * Creates a member account with randomized credentials, mutates the connection with the auth token.
 * Generates random email, password, and session tracking data (href, referrer). Optional fields
 * like display_name, phone_number, and ip are either taken from props or randomly generated.
 * The function calls the SDK join endpoint and returns the IAuthorized response containing
 * both member identity data and JWT tokens.
 */
export async function authorize_member_join(connection: api.IConnection, props: {
    body?: DeepPartial<IEcommerceMallMember.IJoin>;
}): Promise<IEcommerceMallMember.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        display_name: props.body?.display_name ?? RandomGenerator.name(),
        phone_number: props.body?.phone_number ?? RandomGenerator.mobile(),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin;
    return await api.functional.ecommerceMall.auth.member.join(connection, {
        body: joinInput,
    });
}
export async function test_api_refund_request_retrieve_pending(connection: api.IConnection): Promise<void> {
    // 1. Create customer account
    const customerConnection: api.IConnection = { host: connection.host };
    const joined = await authorize_member_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(joined);
    // 2. Generate random refund request ID for retrieval
    const refundRequestId = typia.random<string & tags.Format<"uuid">>();
    // 3. Retrieve refund request by ID using API
    const retrieved: IEcommerceMallRefundRequest = await api.functional.ecommerceMall.member.customer.refund_requests.at(customerConnection, {
        requestId: refundRequestId,
    });
    typia.assert(retrieved);
    // 4. Validate response structure
    TestValidator.equals("refund request id is valid uuid", retrieved.id, typia.random<string & tags.Format<"uuid">>());
    TestValidator.equals("refund request has order_item_id", retrieved.order_item_id !== undefined, true);
    TestValidator.equals("refund request has order_item details", retrieved.order_item.id !== undefined, true);
    TestValidator.equals("refund request order_item quantity is at least 1", retrieved.order_item.quantity >= 1, true);
    TestValidator.equals("refund request order_item unit_price is positive", retrieved.order_item.unit_price > 0, true);
    TestValidator.equals("refund request order_item subtotal matches quantity × unit_price", retrieved.order_item.subtotal, retrieved.order_item.quantity * retrieved.order_item.unit_price);
    TestValidator.equals("refund request has created_at timestamp", retrieved.created_at !== undefined, true);
    TestValidator.equals("refund request has updated_at timestamp", retrieved.updated_at !== undefined, true);
    TestValidator.equals("refund request deleted_at can be null", retrieved.deleted_at === null || retrieved.deleted_at !== undefined, true);
}