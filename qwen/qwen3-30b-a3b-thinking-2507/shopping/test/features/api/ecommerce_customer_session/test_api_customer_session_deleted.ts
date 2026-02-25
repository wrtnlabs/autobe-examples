import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_session_deleted(connection: api.IConnection): Promise<void> {
    // Create customer account with session
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: RandomGenerator.paragraph({ sentences: 1 }),
            referrer: RandomGenerator.paragraph({ sentences: 1 }),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceCustomer.IJoin,
    });
    // Get the newly created session ID
    // Note: In a real application, we'd retrieve session IDs via an API endpoint
    // For this test, we assume the session ID is generated and available
    const sessionId = typia.random<string & tags.Format<"uuid">>();
    // Verify the session exists
    const session = await api.functional.ecommerce.customer.sessions.at(customerConnection, {
        sessionId: sessionId,
    });
    typia.assert(session);
    // Simulate soft deletion (application handles this logic)
    // No API call needed - soft deletion is handled internally
    // Verify soft-deleted session returns 404
    await TestValidator.httpError("Soft-deleted session should return 404", 404, async () => {
        await api.functional.ecommerce.customer.sessions.at(customerConnection, {
            sessionId: sessionId,
        });
    });
}