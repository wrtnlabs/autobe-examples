import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest registration with (optional) connection metadata fields.
 *
 * Validates the complete guest join flow including full metadata submission,
 * partial metadata scenarios, and minimal required fields only. Ensures that
 * the guest account is created correctly with device fingerprint and that
 * optional connection metadata (ip, href, referrer) are properly handled.
 *
 * Special attention is given to verifying that the optional fields accept
 * valid values without errors and that the response contains proper
 * authorization tokens for guest session management.
 *
 * 1. Guest registers with full metadata (device_fingerprint, ip, href, referrer).
 * 2. Verifies response contains valid IShoppingMallGuest.IAuthorized structure.
 * 3. Tests partial metadata submission (only ip provided).
 * 4. Tests minimal registration (only device_fingerprint).
 * 5. Validates all responses contain complete JWT token structure.
 */
export async function test_api_guest_join_with_connection_metadata(connection: api.IConnection): Promise<void> {
    // 1. Test with full metadata
    const fullMetadataConnection: api.IConnection = { host: connection.host };
    const fullMetadataDeviceFingerprint = RandomGenerator.alphaNumeric(32);
    const fullMetadataGuest = await authorize_guest_join(fullMetadataConnection, {
        body: {
            device_fingerprint: fullMetadataDeviceFingerprint,
            ip: typia.random<string & tags.Format<"ipv4">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallGuest.IJoin,
    });
    typia.assert(fullMetadataGuest);
    // 2. Verify device fingerprint matches input
    TestValidator.equals("device fingerprint matches input", fullMetadataGuest.device_fingerprint, fullMetadataDeviceFingerprint);
    // 3. Test with partial metadata (only ip)
    const partialMetadataConnection: api.IConnection = { host: connection.host };
    const partialMetadataDeviceFingerprint = RandomGenerator.alphaNumeric(32);
    const partialMetadataGuest = await authorize_guest_join(partialMetadataConnection, {
        body: {
            device_fingerprint: partialMetadataDeviceFingerprint,
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallGuest.IJoin,
    });
    typia.assert(partialMetadataGuest);
    // 4. Verify partial metadata guest has different id (different fingerprint)
    TestValidator.notEquals("different fingerprints create different guests", fullMetadataGuest.id, partialMetadataGuest.id);
    TestValidator.equals("partial metadata device fingerprint matches", partialMetadataGuest.device_fingerprint, partialMetadataDeviceFingerprint);
    // 5. Test with only required field (device_fingerprint)
    const minimalConnection: api.IConnection = { host: connection.host };
    const minimalDeviceFingerprint = RandomGenerator.alphaNumeric(32);
    const minimalGuest = await authorize_guest_join(minimalConnection, {
        body: {
            device_fingerprint: minimalDeviceFingerprint,
        } satisfies IShoppingMallGuest.IJoin,
    });
    typia.assert(minimalGuest);
    // 6. Verify minimal guest is distinct and has correct fingerprint
    TestValidator.notEquals("minimal guest has unique id", minimalGuest.id, fullMetadataGuest.id);
    TestValidator.notEquals("minimal guest differs from partial", minimalGuest.id, partialMetadataGuest.id);
    TestValidator.equals("minimal device fingerprint matches", minimalGuest.device_fingerprint, minimalDeviceFingerprint);
}