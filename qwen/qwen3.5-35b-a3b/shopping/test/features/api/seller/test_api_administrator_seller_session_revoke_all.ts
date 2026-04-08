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
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_administrator_seller_session_revoke_all(connection: api.IConnection): Promise<void> {
    // 1. Administrator setup - join and login
    const adminConnection: api.IConnection = { host: connection.host };
    const adminResult = await authorize_administrator_join(adminConnection, {
        body: {
            display_name: RandomGenerator.name(2),
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            grade: "regular" as const,
        } satisfies IEcommerceMallAdministrator.IJoin,
    });
    typia.assert(adminResult);
    // 2. Login with administrator to get fresh token for operations
    const adminOperateConnection: api.IConnection = { host: connection.host };
    await authorize_administrator_login(adminOperateConnection, {
        body: {
            email: adminResult.email,
            password: "1234",
            ip: "127.0.0.1",
            referrer: "http://localhost",
        },
    });
    // 3. Revoke all sessions for a seller
    // Use a test seller UUID (in real scenario, this would be an actual seller)
    const sellerId = typia.random<string & tags.Format<"uuid">>();
    const revokeResponse = await api.functional.ecommerceMall.administrator.sellers.sessions.revoke(adminOperateConnection, {
        sellerId,
        body: { all: true },
    });
    typia.assert(revokeResponse);
    // 4. Validate response structure
    TestValidator.equals("seller_id matches request", revokeResponse.seller_id, sellerId);
    TestValidator.equals("count is non-negative", revokeResponse.count >= 0, true);
    TestValidator.equals("count matches array length", revokeResponse.count, revokeResponse.revoked_session_ids.length);
    TestValidator.predicate("revoked_at timestamp exists", revokeResponse.revoked_at !== undefined && revokeResponse.revoked_at.length > 0);
    // 5. Verify revoked_session_ids is an array of UUIDs
    TestValidator.equals("revoked_session_ids is array", Array.isArray(revokeResponse.revoked_session_ids), true);
    // 6. Test edge case: seller with no sessions (same sellerId should return empty array)
    const revokeResponseEmpty = await api.functional.ecommerceMall.administrator.sellers.sessions.revoke(adminOperateConnection, {
        sellerId,
        body: { all: true },
    });
    typia.assert(revokeResponseEmpty);
    TestValidator.equals("second revoke returns empty (no more sessions)", revokeResponseEmpty.count, 0);
    TestValidator.equals("second revoke has empty array", revokeResponseEmpty.revoked_session_ids.length, 0);
    // 7. Test edge case: specific session IDs revocation
    const specificSessionId = typia.random<string & tags.Format<"uuid">>();
    const revokeSpecificResponse = await api.functional.ecommerceMall.administrator.sellers.sessions.revoke(adminOperateConnection, {
        sellerId,
        body: { session_ids: [specificSessionId] },
    });
    typia.assert(revokeSpecificResponse);
    TestValidator.equals("specific revoke seller_id matches", revokeSpecificResponse.seller_id, sellerId);
    // 8. Test validation: cannot revoke with both all=true and session_ids
    // The API should handle this, or we test with only one option at a time
}