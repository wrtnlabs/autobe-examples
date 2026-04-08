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
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_seller_suspension_retrieval_unsuspended_status(connection: api.IConnection): Promise<void> {
    // 1. Create administrator account for authentication
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_administrator_join(adminConnection, {
        body: {
            display_name: RandomGenerator.name(),
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallAdministrator.IJoin,
    });
    typia.assert(adminAuth);
    // 2. Retrieve a seller suspension record (using known UUID)
    // Note: In a real scenario, this would be an existing suspension ID
    // For E2E testing, we validate the API response structure
    const suspensionId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // Use adminConnection (headers updated by authorize_administrator_join)
    const suspension = await api.functional.ecommerceMall.administrator.seller_suspensions.at(adminConnection, {
        suspensionId,
    });
    typia.assert(suspension);
    // 3. Validate suspension record structure has all required fields
    if (suspension.id === undefined)
        throw new Error("Missing suspension id");
    if (suspension.seller.id === undefined)
        throw new Error("Missing seller id");
    if (suspension.suspendedByAdmin.id === undefined)
        throw new Error("Missing admin id");
    if (suspension.suspended_at === undefined)
        throw new Error("Missing suspended_at");
    if (suspension.reason === undefined)
        throw new Error("Missing reason");
    if (suspension.created_at === undefined)
        throw new Error("Missing created_at");
    if (suspension.updated_at === undefined)
        throw new Error("Missing updated_at");
    // 4. Validate resolved_at is not null (indicating unsuspended state)
    if (suspension.resolved_at === null || suspension.resolved_at === undefined) {
        throw new Error("resolved_at should not be null for unsuspended seller");
    }
    // 5. Validate timestamps are in correct order
    if (new Date(suspension.resolved_at) <= new Date(suspension.suspended_at)) {
        throw new Error("resolved_at must be after suspended_at");
    }
    // 6. Validate seller has required summary fields
    if (suspension.seller.display_name === undefined)
        throw new Error("Missing seller display_name");
    if (suspension.seller.approval_status === undefined)
        throw new Error("Missing seller approval_status");
    if (suspension.seller.is_suspended === undefined)
        throw new Error("Missing seller is_suspended");
    if (suspension.seller.created_at === undefined)
        throw new Error("Missing seller created_at");
    // 7. Validate suspendedByAdmin has required summary fields
    if (suspension.suspendedByAdmin.email === undefined)
        throw new Error("Missing admin email");
    if (suspension.suspendedByAdmin.displayName === undefined)
        throw new Error("Missing admin display_name");
    if (suspension.suspendedByAdmin.grade === undefined)
        throw new Error("Missing admin grade");
    if (suspension.suspendedByAdmin.isBanned === undefined)
        throw new Error("Missing admin isBanned");
    if (suspension.suspendedByAdmin.createdAt === undefined)
        throw new Error("Missing admin created_at");
    if (suspension.suspendedByAdmin.updatedAt === undefined)
        throw new Error("Missing admin updated_at");
    // 8. Validate record is active (not soft deleted)
    if (suspension.deleted_at !== null) {
        throw new Error("Deleted record should not be returned");
    }
}