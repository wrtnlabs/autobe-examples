import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login flow from registration through authentication session tracking.
 *
 * Validates the complete member authentication lifecycle: account creation via registration, credential-based login, response structure verification including member identity fields, session metadata capture, and token pair generation.
 *
 * Special attention is given to verifying that session context (IP address, page URL, HTTP referrer) is correctly recorded for audit purposes, and that concurrent login attempts accumulate sessions correctly.
 *
 * 1. Register a new member with explicit email, password, display_name, and session context fields.
 * 2. Login with the same credentials and validate the full response structure.
 * 3. Verify member identity fields: id, email, display_name, avatar (null), phone_number (null), deleted_at (null), timestamps match.
 * 4. Verify session metadata: single session with correct ip, href, referrer.
 * 5. Verify token pair: non-empty access and refresh strings with valid ISO 8601 expiration timestamps.
 * 6. Login again to confirm a second session is created (sessions array length becomes 2).
 *
 * @param connection - The base API connection used to create actor-specific connections.
 */
export async function test_api_member_login_success(connection: api.IConnection): Promise<void> {
    // 1. Prepare controlled credentials for testing
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(16);
    const displayName = RandomGenerator.name();
    const href = typia.random<string & tags.Format<"uri">>();
    const referrer = typia.random<string & tags.Format<"uri">>();
    const ip = typia.random<string & tags.Format<"ipv4">>();
    // 2. Register a new member with explicit credentials
    const joinConnection: api.IConnection = { host: connection.host };
    const joinOutput = await authorize_member_join(joinConnection, {
        body: {
            email,
            password,
            display_name: displayName,
            href,
            referrer,
            ip,
        },
    });
    typia.assert(joinOutput);
    // 3. Login with the same credentials
    const loginConnection: api.IConnection = { host: connection.host };
    const loginOutput = await authorize_member_login(loginConnection, {
        body: {
            email,
            password: password as string & tags.Format<"password">,
            href,
            referrer,
            ip,
        } satisfies IHrmTimeTrackingMember.ILogin,
    });
    typia.assert(loginOutput);
    // 4. Verify member identity matches registration
    TestValidator.equals("email matches", loginOutput.email, email);
    TestValidator.equals("display_name matches", loginOutput.display_name, displayName);
    TestValidator.equals("avatar is null", loginOutput.avatar, null);
    TestValidator.equals("phone_number is null", loginOutput.phone_number, null);
    TestValidator.equals("deleted_at is null", loginOutput.deleted_at, null);
    TestValidator.equals("id matches", loginOutput.id, joinOutput.id);
    TestValidator.equals("created_at matches", loginOutput.created_at, joinOutput.created_at);
    // 5. Verify session metadata
    TestValidator.predicate("has exactly one session", () => loginOutput.sessions.length === 1);
    const session = loginOutput.sessions[0];
    TestValidator.equals("session ip matches", session.ip, ip);
    TestValidator.equals("session href matches", session.href, href);
    TestValidator.equals("session referrer matches", session.referrer, referrer);
    // 6. Verify token pair
    TestValidator.predicate("access token is non-empty string", () => typeof loginOutput.token.access === "string" &&
        loginOutput.token.access.length > 0);
    TestValidator.predicate("refresh token is non-empty string", () => typeof loginOutput.token.refresh === "string" &&
        loginOutput.token.refresh.length > 0);
    TestValidator.predicate("access token expired_at is valid date-time", () => !Number.isNaN(Date.parse(loginOutput.token.expired_at)));
    TestValidator.predicate("refreshable_until is valid date-time", () => !Number.isNaN(Date.parse(loginOutput.token.refreshable_until)));
    // 7. Login again to verify session accumulation
    const secondLoginConnection: api.IConnection = { host: connection.host };
    const secondLoginOutput = await authorize_member_login(secondLoginConnection, {
        body: {
            email,
            password: password as string & tags.Format<"password">,
            href,
            referrer,
            ip,
        } satisfies IHrmTimeTrackingMember.ILogin,
    });
    typia.assert(secondLoginOutput);
    TestValidator.equals("second login has 2 sessions", secondLoginOutput.sessions.length, 2);
}