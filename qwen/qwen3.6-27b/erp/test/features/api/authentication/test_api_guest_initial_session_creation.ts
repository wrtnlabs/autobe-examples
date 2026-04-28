import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

async function authorize_guest_join(connection: api.IConnection, props: {
    body?: Partial<IHrmPlatformGuest.IJoin>;
}): Promise<IHrmPlatformGuest.IAuthorized> {
    const joinInput: IHrmPlatformGuest.IJoin = {
        device_fingerprint: props.body?.device_fingerprint ??
            typia.random<string & tags.MinLength<1>>(),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    };
    return await api.functional.hrmPlatform.auth.guest.join(connection, {
        body: joinInput,
    });
}

/**
 * Test guest join operation for a brand new visitor accessing public entry points.
 *
 * Validates that creating a guest session returns a valid ID and token structure.
 * Verifies that a subsequent join with the same device fingerprint reuses the
 * existing guest ID but issues new tokens, confirming the find-or-create behavior
 * and session renewal mechanism.
 *
 * 1. Creates a new guest session with a unique device fingerprint.
 * 2. Verifies the response structure including guest ID and token fields.
 * 3. Joins again with the same fingerprint but a different href.
 * 4. Asserts that the guest ID remains identical to the first session.
 * 5. Asserts that the access and refresh tokens are renewed.
 */
export async function test_api_guest_initial_session_creation(connection: api.IConnection): Promise<void> {
    // 1. Guest joins with a unique device fingerprint
    const guestConnection: api.IConnection = { host: connection.host };
    const guest = await authorize_guest_join(guestConnection, {
        body: {
            device_fingerprint: "visitor-device-001",
            href: "https://app.example.com/signup",
        },
    });
    // 2. Verify response structure (validates entire object recursively)
    typia.assert(guest);
    // 3. Guest joins again with same device fingerprint but different href
    const guestConnectionRefresh: api.IConnection = { host: connection.host };
    const guestRefresh = await authorize_guest_join(guestConnectionRefresh, {
        body: {
            device_fingerprint: "visitor-device-001",
            href: "https://app.example.com/login",
        },
    });
    // 4. Verify guest ID is identical (find-or-create behavior)
    typia.assert(guestRefresh);
    TestValidator.equals("guest ID matches", guestRefresh.id, guest.id);
    // 5. Verify tokens are renewed
    TestValidator.notEquals("access token renewed", guestRefresh.token.access, guest.token.access);
    TestValidator.notEquals("refresh token renewed", guestRefresh.token.refresh, guest.token.refresh);
}