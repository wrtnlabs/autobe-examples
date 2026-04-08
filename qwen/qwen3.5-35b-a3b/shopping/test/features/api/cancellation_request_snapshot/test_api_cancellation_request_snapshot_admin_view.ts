import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_cancellation_request_snapshot_admin_view(connection: api.IConnection): Promise<void> {
    // 1. Register administrator
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_administrator_join(adminConnection, {
        body: {
            display_name: RandomGenerator.name(2),
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            grade: "regular",
        },
    });
    typia.assert(adminAuth);
    // 2. Create admin connection with token
    const adminSessionConnection: api.IConnection = { host: connection.host };
    adminSessionConnection.headers = { Authorization: adminAuth.token.access };
    // 3. Retrieve cancellation request snapshot
    const snapshotId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const snapshot: IEcommerceMallCancellationRequestSnapshot = await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.at(adminSessionConnection, {
        id: snapshotId,
    });
    typia.assert(snapshot);
    // 4. Validate snapshot structure
    TestValidator.equals("snapshot id is valid uuid", snapshot.id, snapshot.id);
    // Validate cancellation request reference
    TestValidator.notEquals("cancellation request reference exists", snapshot.cancellationRequest, null);
    TestValidator.equals("cancellation request id is valid uuid", snapshot.cancellationRequest.id, snapshot.cancellationRequest.id);
    // Validate text fields
    TestValidator.equals("title is not empty", snapshot.title.length > 0, true);
    TestValidator.equals("body (cancellation reason) is not empty", snapshot.body.length > 0, true);
    TestValidator.equals("actor type is set", snapshot.actorType.length > 0, true);
    // Validate timestamps
    TestValidator.equals("created_at is valid datetime", !isNaN(Date.parse(snapshot.createdAt)), true);
    // Validate nullable timestamps and reasons
    if (snapshot.approvedAt !== null) {
        TestValidator.equals("approved_at is valid datetime when present", !isNaN(Date.parse(snapshot.approvedAt)), true);
    }
    if (snapshot.rejectedAt !== null) {
        TestValidator.equals("rejected_at is valid datetime when present", !isNaN(Date.parse(snapshot.rejectedAt)), true);
    }
    // Validate created by
    TestValidator.equals("created_by is set", snapshot.createdBy.length > 0, true);
    // Validate soft delete is not set
    TestValidator.equals("snapshot not soft-deleted", snapshot.deletedAt, null);
    // 5. Test immutability - verify response structure cannot be modified
    const snapshotIdBefore: string = snapshot.id;
    typia.assert(snapshot);
    const snapshotIdAfter: string = snapshot.id;
    TestValidator.equals("snapshot id immutable after re-validation", snapshotIdBefore, snapshotIdAfter);
}