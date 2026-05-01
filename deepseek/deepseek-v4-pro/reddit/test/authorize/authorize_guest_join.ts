import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register or identify a guest visitor by device fingerprint and establish an authorized browsing session.

 * Creates or retrieves a guest record using a randomized device fingerprint hash, along with generated session context (page URL, referrer, and IP). The function mutates the connection with the returned JWT access token so subsequent API calls are authenticated.
 *
 * All fields except `fingerprint` use `typia.random` to generate format-valid values, ensuring the guest join request is well-formed. The IP address is optional per the schema — when provided by the caller, it is used directly; otherwise a random IPv4 address is generated as fallback.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityHubGuest.IJoin>;
  },
): Promise<ICommunityHubGuest.IAuthorized> {
  const joinInput = {
    fingerprint: props.body?.fingerprint ?? RandomGenerator.alphaNumeric(32),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityHubGuest.IJoin;
  return await api.functional.communityHub.auth.guest.join(connection, {
    body: joinInput,
  });
}
