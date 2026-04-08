import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cancellation_request_snapshot_customer_list_initial_state(connection: api.IConnection): Promise<void> {
    // 1. Create and authorize customer
    const customerConnection: api.IConnection = {
        host: connection.host,
    };
    await authorize_customer_join(customerConnection, {
        body: {
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });

    // 2. Create a new cancellation request with specific reason for validation
    const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
    const cancellationRequest = await generate_random_ecommerce_mall_customer_cancellation_requests_create(customerConnection, {
        body: {
            reason: cancellationReason,
        },
    });
    typia.assert(cancellationRequest);

    // 3. List snapshots for the cancellation request
    const snapshotList: IPageIEcommerceMallCancellationRequestSnapshot.ISummary = await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(customerConnection, {
        cancellationRequestId: cancellationRequest.id,
        body: {
            page: 1,
            limit: 10,
            createdAtFrom: null,
            createdAtTo: null,
            statusBefore: null,
            statusAfter: null,
            sortField: "created_at",
            sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
    });
    typia.assert(snapshotList);

    // 4. Verify that at least one snapshot exists for fresh request
    TestValidator.predicate("at least one snapshot exists for fresh request", snapshotList.data.length > 0);

    // 5. Validate the initial snapshot contains accurate information
    const initialSnapshot = snapshotList.data[0];
    typia.assert(initialSnapshot);

    // Verify statusBefore is pending (initial state)
    TestValidator.equals("initial snapshot statusBefore is pending", initialSnapshot.statusBefore, "pending");

    // Verify statusAfter is pending (no seller action yet)
    TestValidator.equals("initial snapshot statusAfter is pending", initialSnapshot.statusAfter, "pending");

    // Verify the reason is preserved in before state
    TestValidator.equals("initial snapshot reasonBefore matches request reason", initialSnapshot.reasonBefore, cancellationReason);
}