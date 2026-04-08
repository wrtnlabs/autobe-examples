import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new member for E2E testing.
 *
 * Creates a member account with randomized credentials, password, and contact
 * information. The system automatically creates an initial organization with
 * the member as Owner, including currency and description settings. Upon
 * successful registration, returns access and refresh tokens for immediate
 * API authentication without requiring a separate login.
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformMember.IJoin>;
  },
): Promise<IHrmPlatformMember.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    name: props.body?.name ?? RandomGenerator.name(),
    phone_number: props.body?.phone_number ?? RandomGenerator.mobile(),
    avatar_uri:
      props.body?.avatar_uri ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 8 }),
    org_name: props.body?.org_name ?? RandomGenerator.name(),
    org_currency:
      props.body?.org_currency ?? RandomGenerator.pick(["USD", "EUR", "KRW"]),
    org_description: props.body?.org_description ?? RandomGenerator.paragraph(),
    org_logo_uri:
      props.body?.org_logo_uri ?? typia.random<string & tags.Format<"uri">>(),
    org_timezone:
      props.body?.org_timezone ??
      RandomGenerator.pick(["UTC", "Asia/Seoul", "America/New_York"]),
    org_fiscal_month:
      props.body?.org_fiscal_month ?? RandomGenerator.pick([1, 4, 7, 10]),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.IJoin;
  return await api.functional.hrmPlatform.auth.member.join(connection, {
    body: joinInput,
  });
}
