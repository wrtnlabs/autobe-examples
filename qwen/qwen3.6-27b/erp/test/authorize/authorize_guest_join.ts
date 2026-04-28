import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate an anonymous guest for E2E testing.
 *
 * Creates a guest identity using a device fingerprint along with session context
 * (href, and optionally ip, referrer) to create or resume a guest profile
 * for browsing public entry points such as sign-up and login pages.
 *
 * The device fingerprint uniquely identifies the visitor's browser and device
 * characteristics. Session context fields record the current page URL,
 * referring source URL, and client IP address for tracking purposes.
 * The backend creates both the guest profile and initial session in a single
 * transaction, then returns authentication tokens for maintaining session state
 * while browsing public pages.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformGuest.IJoin>;
  },
): Promise<IHrmPlatformGuest.IAuthorized> {
  const joinInput = {
    device_fingerprint:
      props.body?.device_fingerprint ??
      typia.random<string & tags.MinLength<1>>(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmPlatformGuest.IJoin;
  return await api.functional.hrmPlatform.auth.guest.join(connection, {
    body: joinInput,
  });
}
