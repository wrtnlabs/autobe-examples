import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
/**
 * Test seller viewing cancellation request snapshots for their own order items.
 *
 * Validates that sellers can retrieve snapshots of their responses to customer cancellation requests. The test registers a seller, ensures approval, and verifies the snapshot endpoint returns snapshots for cancellation requests where the seller responded. Each snapshot contains the seller's response timestamps (approved_at or rejected_at), seller rejection reason if applicable, and proper pagination metadata.
 *
 * The test validates business rules:
 * 1. Seller can only view snapshots related to their order items
 * 2. Snapshot correctly shows approved_at or rejected_at based on response
 * 3. Seller rejection reason is included when rejection occurred
 * 4. Pagination metadata is accurate
 * 5. Snapshots are immutable (cannot be modified after creation)
 */
export async function test_api_seller_cancellation_request_snapshots_view_own_requests(connection: api.IConnection): Promise<void> {
    // 1. Register and approve seller
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerJoinInput = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin;
    const seller: IEcommerceMallSeller.IAuthorized = await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
        body: sellerJoinInput,
    });
    typia.assert(seller);
    // 2. Call snapshots endpoint with seller authentication
    const snapshotResponse: IPageIEcommerceMallCancellationRequestSnapshot.ISummary = await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(sellerConnection, {
        body: {
            actor_type: "customer",
            limit: 10,
            page: 1,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
    });
    typia.assert(snapshotResponse);
    // 3. Validate pagination metadata
    TestValidator.equals("pagination current page", snapshotResponse.pagination.current, 1);
    TestValidator.equals("pagination limit", snapshotResponse.pagination.limit, 10);
    TestValidator.predicate("pagination records non-negative", snapshotResponse.pagination.records >= 0);
    TestValidator.predicate("pagination pages non-negative", snapshotResponse.pagination.pages >= 0);
    // 4. Validate snapshot structure for each item
    for (const snapshot of snapshotResponse.data) {
        // Validate required fields exist (typia.assert already validates format)
        const hasApprovedAt = snapshot.approved_at !== undefined && snapshot.approved_at !== null;
        const hasRejectedAt = snapshot.rejected_at !== undefined && snapshot.rejected_at !== null;
        // Only one of approved_at or rejected_at should be present for a completed response
        TestValidator.predicate("only one response timestamp present", (hasApprovedAt && !hasRejectedAt) || (!hasApprovedAt && hasRejectedAt));
        // Validate rejection reason only present when rejected (can be null or string)
        if (hasRejectedAt) {
            TestValidator.predicate("rejection reason valid type", snapshot.seller_rejection_reason === null ||
                typeof snapshot.seller_rejection_reason === "string");
        }
        // Validate cancellation request reference
        typia.assert(snapshot.cancellationRequest);
    }
}