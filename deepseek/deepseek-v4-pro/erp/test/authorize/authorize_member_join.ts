import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new member for E2E testing.
 *
 * Creates a member account with randomized credentials, mutates the connection with the auth token. The member's email, password, display name, and session context fields (href, referrer, IP) are randomly generated when not provided, ensuring isolated test scenarios without data collisions.
 *
 * @param connection The connection to mutate with the auth token
 * @param props.body Optional partial join payload — unspecified fields are randomized
 * @returns The authorized member with JWT tokens and profile
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmMember.IJoin>;
  },
): Promise<IErpHrmMember.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmMember.IJoin;
  return await api.functional.erpHrm.auth.member.join(connection, {
    body: joinInput,
  });
}
