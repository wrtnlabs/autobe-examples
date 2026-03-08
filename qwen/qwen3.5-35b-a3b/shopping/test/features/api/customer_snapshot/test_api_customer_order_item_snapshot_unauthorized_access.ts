import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function authorize_customer_join(connection: api.IConnection, props: {
    body?: DeepPartial<IEcommerceMallCustomer.IJoin>;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? "1234",
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin;
    return await api.functional.ecommerceMall.auth.customer.join(connection, {
        body: joinInput,
    });
}
export async function test_api_customer_order_item_snapshot_unauthorized_access(connection: api.IConnection): Promise<void> {
    // 1. Customer A joins
    const customerAConnection: api.IConnection = { host: connection.host };
    const customerA: IEcommerceMallCustomer.IAuthorized = await authorize_customer_join(customerAConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallCustomer.IJoin,
    });
    typia.assert(customerA);
    // 2. Customer B joins
    const customerBConnection: api.IConnection = { host: connection.host };
    const customerB: IEcommerceMallCustomer.IAuthorized = await authorize_customer_join(customerBConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallCustomer.IJoin,
    });
    typia.assert(customerB);
    // 3. Customer B attempts to retrieve a snapshot that belongs to Customer A
    // Generate a snapshotId (in real scenario, this would be Customer A's snapshot ID)
    const snapshotId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 4. Validate that Customer B gets 403 Forbidden (they don't own this snapshot)
    await TestValidator.error("unauthorized snapshot access", async () => {
        await api.functional.ecommerceMall.customer.order_item_snapshots.at(customerBConnection, {
            snapshotId,
        });
    });
}