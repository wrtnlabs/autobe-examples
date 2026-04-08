import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest user for E2E testing.
 *
 * Creates a guest account with randomized device fingerprint and session context, mutates the connection with the auth token. This enables unauthenticated users to access the system with limited session-based permissions.
 *
 * **Random Data Generation**
 *
 * - device_fingerprint: Random alphanumeric string for device identification
 * - href: Random URI for session entry point tracking
 * - referrer: Random URI for session source tracking
 * - ip: Random IPv4 address for security auditing (optional)
 *
 * **Authentication Flow**
 *
 * The SDK function creates a guest record in hrm_guests table, generates a session in hrm_guest_sessions with JWT tokens, and automatically sets the Authorization header on the connection object for subsequent API calls.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmGuest.IJoin>;
  },
): Promise<IHrmGuest.IAuthorized> {
  const joinInput = {
    device_fingerprint:
      props.body?.device_fingerprint ?? RandomGenerator.alphaNumeric(32),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmGuest.IJoin;
  return await api.functional.hrm.auth.guest.join(connection, {
    body: joinInput,
  });
}
