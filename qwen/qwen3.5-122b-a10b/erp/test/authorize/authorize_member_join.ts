import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new member for HRM system E2E testing.
 *
 * Creates a member account with randomized credentials and mutates the connection with the auth token. The member will need to verify their email address before accessing organization-scoped features.
 *
 * **Registration Flow:**
 * - Generates random email, password, and session context (href, referrer, optional ip)
 * - Calls the member join API to create the account
 * - Returns authentication tokens with email_verified flag set to false
 * - Connection headers are updated with the access token for subsequent API calls
 *
 * **Session Context:**
 * Session tracking fields capture the client environment at registration time. These are stored in the session record rather than the member account itself, maintaining separation between identity and connection metadata.
 *
 * @param connection HTTP connection configuration
 * @param props Optional body overrides for custom test scenarios
 * @returns Member authorization response with tokens and profile information
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmMember.IJoin>;
  },
): Promise<IHrmMember.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmMember.IJoin;
  return await api.functional.hrm.auth.member.join(connection, {
    body: joinInput,
  });
}
