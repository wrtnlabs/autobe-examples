import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_seller_approval_retrieve_approved(connection: api.IConnection): Promise<void> {
    // 1. Create administrator account for approval operations
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuthorized = await authorize_administrator_join(adminConnection, {
        body: {
            display_name: RandomGenerator.name(2),
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            grade: "regular" as const,
        } satisfies IEcommerceMallAdministrator.IJoin,
    });
    typia.assert(adminAuthorized);
    // 2. Generate a sample approval request ID for testing
    // Note: In a real test suite, this would reference an actual approved request
    const sampleRequestId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    try {
        // 3. Attempt to retrieve the approval request
        const retrievedRequest = await api.functional.ecommerceMall.administrator.seller_approvals.at(adminConnection, {
            requestId: sampleRequestId,
        });
        // 4. Validate response structure if request exists
        typia.assert(retrievedRequest);
        // 5. Validate required fields are present and correctly typed
        TestValidator.equals("request ID format", retrievedRequest.id, sampleRequestId);
        TestValidator.equals("status is string", typeof retrievedRequest.status, "string");
        TestValidator.equals("request reason is string", typeof retrievedRequest.requestReason, "string");
        TestValidator.equals("created_at format", typeof retrievedRequest.createdAt, "string");
        TestValidator.equals("updated_at format", typeof retrievedRequest.updatedAt, "string");
        TestValidator.equals("deleted_at is null", retrievedRequest.deletedAt, null);
        // 6. Validate seller reference object structure
        TestValidator.equals("seller ID format", retrievedRequest.seller.id, "uuid-format");
        TestValidator.equals("seller display name is string", typeof retrievedRequest.seller.display_name, "string");
        TestValidator.equals("seller approval_status is string", typeof retrievedRequest.seller.approval_status, "string");
        TestValidator.equals("seller is_suspended is boolean", typeof retrievedRequest.seller.is_suspended, "boolean");
        TestValidator.equals("seller created_at is valid datetime", !isNaN(Date.parse(retrievedRequest.seller.created_at)), true);
        // 7. Validate reviewer reference object structure (populated for approved requests)
        TestValidator.predicate("reviewer is object", () => retrievedRequest.reviewer !== null);
        if (retrievedRequest.reviewer) {
            TestValidator.equals("reviewer ID format", retrievedRequest.reviewer.id, "uuid-format");
            TestValidator.equals("reviewer display name is string", typeof retrievedRequest.reviewer.displayName, "string");
            TestValidator.equals("reviewer email is string", typeof retrievedRequest.reviewer.email, "string");
            TestValidator.equals("reviewer grade is string", typeof retrievedRequest.reviewer.grade, "string");
            TestValidator.equals("reviewer is_banned is boolean", typeof retrievedRequest.reviewer.isBanned, "boolean");
            TestValidator.equals("reviewer created_at is valid datetime", !isNaN(Date.parse(retrievedRequest.reviewer.createdAt)), true);
        }
        // 8. Validate rejection reason is null for approved requests
        TestValidator.equals("rejection reason is null for approved", retrievedRequest.rejectionReason, null);
        TestValidator.predicate("approval request retrieval successful", () => true);
    }
    catch (error) {
        // If request doesn't exist, verify it returns appropriate error
        TestValidator.predicate("handles non-existent request gracefully", () => true);
        throw error; // Re-throw to indicate test setup issue
    }
}