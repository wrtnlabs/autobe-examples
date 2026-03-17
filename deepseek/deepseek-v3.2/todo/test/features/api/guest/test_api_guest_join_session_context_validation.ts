import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_join_session_context_validation(connection: api.IConnection): Promise<void> {
    // Test 1: Valid session context with all fields including optional IP
    const validConnection1: api.IConnection = { host: connection.host };
    const validData1 = {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin;
    const guest1 = await authorize_guest_join(validConnection1, {
        body: validData1,
    });
    typia.assert(guest1);
    TestValidator.equals("device fingerprint should match input", guest1.device_fingerprint, validData1.device_fingerprint);
    // Test 2: Valid session context without optional IP field
    const validConnection2: api.IConnection = { host: connection.host };
    const validData2 = {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin;
    const guest2 = await authorize_guest_join(validConnection2, {
        body: validData2,
    });
    typia.assert(guest2);
    TestValidator.equals("guest created without ip should have device fingerprint", guest2.device_fingerprint, validData2.device_fingerprint);
    // Test 3: Test that session context fields don't affect guest creation logic
    // by creating multiple guests with different href/referrer but same device fingerprint pattern
    const baseFingerprint = RandomGenerator.alphaNumeric(32);
    for (let i = 0; i < 3; i++) {
        const testConnection: api.IConnection = { host: connection.host };
        const testData = {
            device_fingerprint: `${baseFingerprint}-${i}`,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: i % 2 === 0 ? typia.random<string & tags.Format<"ipv4">>() : undefined,
        } satisfies ITodoAppGuest.IJoin;
        const guest = await authorize_guest_join(testConnection, {
            body: testData,
        });
        typia.assert(guest);
        TestValidator.equals(`guest ${i} device fingerprint matches`, guest.device_fingerprint, testData.device_fingerprint);
    }
    // Test 4: Test IP field optionality by creating guests with and without IP
    const withIpConnection: api.IConnection = { host: connection.host };
    const withIpData = {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin;
    const withIpGuest = await authorize_guest_join(withIpConnection, {
        body: withIpData,
    });
    typia.assert(withIpGuest);
    const withoutIpConnection: api.IConnection = { host: connection.host };
    const withoutIpData = {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin;
    const withoutIpGuest = await authorize_guest_join(withoutIpConnection, {
        body: withoutIpData,
    });
    typia.assert(withIpGuest);
    typia.assert(withoutIpGuest);
    // Both should have valid authorization tokens
    TestValidator.predicate("guest with IP has valid access token", withIpGuest.token.access.length > 0);
    TestValidator.predicate("guest without IP has valid access token", withoutIpGuest.token.access.length > 0);
    TestValidator.predicate("guest with IP has valid refresh token", withIpGuest.token.refresh.length > 0);
    TestValidator.predicate("guest without IP has valid refresh token", withoutIpGuest.token.refresh.length > 0);
    // Test 5: Verify session context fields don't affect guest account creation
    // by creating multiple guests with different href/referrer but same device fingerprint pattern
    const baseFingerprint2 = RandomGenerator.alphaNumeric(24);
    for (let i = 0; i < 2; i++) {
        const sessionConnection: api.IConnection = { host: connection.host };
        const sessionData = {
            device_fingerprint: `${baseFingerprint2}-session-${i}`,
            href: `https://example.com/path${i}` satisfies string & tags.Format<"uri"> as string & tags.Format<"uri">,
            referrer: `https://referrer.com/page${i}` satisfies string & tags.Format<"uri"> as string & tags.Format<"uri">,
            ip: i === 0 ? typia.random<string & tags.Format<"ipv4">>() : undefined,
        } satisfies ITodoAppGuest.IJoin;
        const sessionGuest = await authorize_guest_join(sessionConnection, {
            body: sessionData,
        });
        typia.assert(sessionGuest);
        // Validate guest account structure
        TestValidator.predicate(`session guest ${i} has uuid id`, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionGuest.id));
        TestValidator.predicate(`session guest ${i} has valid timestamps`, !!sessionGuest.created_at && !!sessionGuest.updated_at);
    }
}