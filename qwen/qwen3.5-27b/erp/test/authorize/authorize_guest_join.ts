import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Accept a guest organization invitation and create a new user account.
 *
 * This function allows unregistered guests to accept organization invitations by creating a new account. The guest provides their email address and invitation token, which are validated against the pending invitations in the system. Upon successful validation, a new user account is created with the assigned role from the invitation.
 *
 * The function generates random test data for all required fields when not explicitly provided, including email, invitation token, password, name, and session context information (href, referrer, ip). The invitation token proves that the recipient has access to the invited email address and is authorized to accept the invitation.
 *
 * After successful account creation, the function returns authorization tokens (access and refresh) that enable authenticated access during the invitation acceptance workflow. The connection is automatically mutated with the access token for subsequent API calls.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackGuest.IJoin>;
  },
): Promise<IHrmTimeTrackGuest.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    invitationToken:
      props.body?.invitationToken ?? RandomGenerator.alphaNumeric(32),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    name: props.body?.name ?? RandomGenerator.name(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackGuest.IJoin;
  return await api.functional.hrmTimeTrack.auth.guest.join(connection, {
    body: joinInput,
  });
}
