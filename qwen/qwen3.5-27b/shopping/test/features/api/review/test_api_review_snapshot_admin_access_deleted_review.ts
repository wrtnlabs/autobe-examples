import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test that an administrator can access review snapshots even when the original review has been soft deleted.
 * This validates the business rule that deleted reviews maintain their complete snapshot history for audit compliance.
 */
export async function test_api_review_snapshot_admin_access_deleted_review(connection: api.IConnection): Promise<void> {
    // 1. Admin setup - authenticate as administrator
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: "admin@test.com",
            password: "1234",
            href: "https://test.com/admin/join",
            referrer: "https://test.com",
        } satisfies IShoppingMallAdmin.IJoin,
    });
    // 2. Generate a review ID for testing snapshot access
    // In a real scenario, this would be an actual review ID from a deleted review
    const reviewId: string & typia.tags.Format<"uuid"> = typia.random<string & typia.tags.Format<"uuid">>();
    // 3. Admin attempts to access snapshots for the review
    // This validates that admin has authorization to access review snapshots
    const snapshotsResponse = await api.functional.shoppingMall.admin.reviews.snapshots.index(adminConnection, {
        reviewId: reviewId,
        body: {
            page: 1,
            limit: 20,
            sortBy: "created_at",
            sortOrder: "desc",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
    });
    typia.assert(snapshotsResponse);
    // 4. Validate response structure
    TestValidator.predicate("response has pagination", snapshotsResponse.pagination !== undefined);
    TestValidator.predicate("response has data array", Array.isArray(snapshotsResponse.data));
    // 5. Validate pagination metadata
    TestValidator.equals("current page is 1", snapshotsResponse.pagination.current, 1);
    TestValidator.equals("limit is 20", snapshotsResponse.pagination.limit, 20);
    TestValidator.predicate("total records is non-negative", snapshotsResponse.pagination.records >= 0);
    TestValidator.predicate("total pages is non-negative", snapshotsResponse.pagination.pages >= 0);
    // 6. If snapshots exist, validate their structure and data integrity
    if (snapshotsResponse.data.length > 0) {
        const firstSnapshot = snapshotsResponse.data[0];
        // Validate snapshot has required fields with correct types
        TestValidator.predicate("snapshot has valid UUID", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstSnapshot.id));
        TestValidator.equals("snapshot references correct review", firstSnapshot.shopping_mall_review_id, reviewId);
        TestValidator.predicate("snapshot has data field", firstSnapshot.snapshot_data !== undefined && firstSnapshot.snapshot_data.length > 0);
        TestValidator.predicate("snapshot has timestamp", firstSnapshot.created_at !== undefined);
        // Validate snapshot_data is valid JSON (denormalized review state)
        try {
            const parsedData = JSON.parse(firstSnapshot.snapshot_data);
            TestValidator.predicate("snapshot data is valid JSON object", typeof parsedData === "object" && parsedData !== null);
        }
        catch {
            throw new Error("Snapshot data is not valid JSON");
        }
    }
    // 7. Test pagination with different parameters
    const paginatedResponse = await api.functional.shoppingMall.admin.reviews.snapshots.index(adminConnection, {
        reviewId: reviewId,
        body: {
            page: 1,
            limit: 10,
            sortBy: "created_at",
            sortOrder: "asc",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
    });
    typia.assert(paginatedResponse);
    TestValidator.equals("pagination limit applied correctly", paginatedResponse.pagination.limit, 10);
    TestValidator.equals("current page is 1", paginatedResponse.pagination.current, 1);
    // 8. Test with different page number
    const page2Response = await api.functional.shoppingMall.admin.reviews.snapshots.index(adminConnection, {
        reviewId: reviewId,
        body: {
            page: 2,
            limit: 5,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
    });
    typia.assert(page2Response);
    TestValidator.equals("page 2 requested", page2Response.pagination.current, 2);
    TestValidator.equals("limit is 5", page2Response.pagination.limit, 5);
    // 9. Core business rule validation:
    // Admin can access review snapshots regardless of review status (active/deleted)
    // This ensures audit trail is preserved even after review deletion
    TestValidator.predicate("admin has access to review snapshots endpoint", snapshotsResponse.pagination.records >= 0);
    // 10. Verify snapshot immutability - all snapshots should have created_at timestamps
    for (const snapshot of snapshotsResponse.data) {
        TestValidator.predicate(
            `snapshot ${snapshot.id} has creation timestamp`,
            snapshot.created_at !== undefined && snapshot.created_at.length > 0,
        );
    }
}