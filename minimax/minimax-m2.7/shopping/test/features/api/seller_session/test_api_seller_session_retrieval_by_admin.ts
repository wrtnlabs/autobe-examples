import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_session_retrieval_by_admin(connection: api.IConnection): Promise<void> {
    // 1. Create seller account first
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const sellerPassword = RandomGenerator.alphaNumeric(16);
    // Register seller (this creates initial session)
    const sellerJoinConnection: api.IConnection = { host: connection.host };
    const sellerJoinAuth = await api.functional.ecommerceMall.auth.seller.join(sellerJoinConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
            href: "https://example.com/seller/register",
            referrer: "https://example.com",
        },
    });
    typia.assert(sellerJoinAuth);
    // 2. Create admin account (need to do this before we can query sessions)
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await api.functional.ecommerceMall.auth.admin.request.join(adminConnection, {
        body: {
            actorType: "seller",
            requestedGrade: "admin",
            reason: "Need admin access for seller session management",
            href: "https://example.com/admin/request",
            referrer: "https://example.com",
        },
    });
    typia.assert(adminAuth);
    // Create a new admin login session to get proper admin credentials
    const adminLoginConnection: api.IConnection = { host: connection.host };
    const adminLogin = await api.functional.ecommerceMall.auth.admin.login(adminLoginConnection, {
        body: {
            email: adminAuth.email,
            password: "adminpassword123",
            href: "https://example.com/admin/login",
            referrer: "https://example.com/admin",
        },
    });
    typia.assert(adminLogin);
    // 3. Create another seller session via login
    const sellerLoginConnection: api.IConnection = { host: connection.host };
    const sellerLoginAuth = await api.functional.ecommerceMall.auth.seller.login(sellerLoginConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
        },
    });
    typia.assert(sellerLoginAuth);
    // 4. Admin retrieves the seller session
    // Note: The sessionId should come from the login response or be retrieved separately
    // For this test, we use the access token as a proxy for session identification
    // In real scenarios, you would query sessions list first or use the actual session ID
    const session = await api.functional.ecommerceMall.admin.sellers.sessions.at(adminLoginConnection, {
        sellerId: sellerJoinAuth.id,
        sessionId: sellerJoinAuth.token.access as unknown as string & tags.Format<"uuid">,
    });
    typia.assert(session);
    // 5. Validate session metadata completeness
    TestValidator.equals("session has valid id", !!session.id, true);
    TestValidator.equals("session sellerId matches seller", session.sellerId, sellerJoinAuth.id);
    TestValidator.equals("session has ip address", typeof session.ip === "string", true);
    TestValidator.equals("session has href", typeof session.href === "string", true);
    TestValidator.equals("session has referrer", typeof session.referrer === "string", true);
    TestValidator.equals("session has createdAt timestamp", !!session.createdAt, true);
    TestValidator.equals("session has expiredAt timestamp", !!session.expiredAt, true);
    // 6. Validate seller summary in response
    TestValidator.equals("seller summary exists", !!session.seller, true);
    TestValidator.equals("seller email matches", session.seller.email, sellerEmail);
    TestValidator.equals("seller has approval status", typeof session.seller.approvalStatus === "string", true);
    TestValidator.equals("seller id in summary matches", session.seller.id, sellerJoinAuth.id);
}