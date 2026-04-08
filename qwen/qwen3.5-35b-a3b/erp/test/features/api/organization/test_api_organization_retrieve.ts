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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_retrieve(
  connection: api.IConnection,
): Promise<void> {} // 1. Register member with initial organization  const joinConnection: api.IConnection = { host: connection.host };  const joinResult = await authorize_member_join(joinConnection, {    body: {      email: typia.random<string & tags.Format<"email">>(),      password: RandomGenerator.alphaNumeric(16),      name: RandomGenerator.name(),      org_name: RandomGenerator.name(),      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),      org_description: RandomGenerator.paragraph(),      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul", "America/New_York"]),      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),      href: typia.random<string & tags.Format<"uri">>(),      referrer: typia.random<string & tags.Format<"uri">>(),    } satisfies IHrmPlatformMember.IJoin,  });  typia.assert(joinResult);  // Extract organization ID from member summary const organizationId: string & tags.Format<"uuid"> = joinResult.member.organization.id;  // 2. Retrieve organization using authenticated connection (joinConnection already has token from authorize_member_join)  const organization = await api.functional.hrmPlatform.member.organizations.at(joinConnection, {    organizationId,  });  typia.assert(organization);  // 3. Validate organization data  TestValidator.equals("organization ID matches request", organization.id, organizationId);  TestValidator.equals("organization name matches registration", organization.name, joinResult.member.organization.name);  TestValidator.equals("organization description matches registration", organization.description, joinResult.member.organization.description);  TestValidator.equals("organization currency matches registration", organization.currency, joinResult.member.organization.currency);  TestValidator.equals("organization timezone matches registration", organization.timezone, joinResult.member.organization.timezone);  TestValidator.equals("fiscal start month matches registration", organization.fiscal_start_month, joinResult.member.organization.fiscal_start_month);  TestValidator.equals("owner ID matches authenticated member", organization.owner.id, joinResult.member.id);  TestValidator.equals("owner email matches authenticated member", organization.owner.email, joinResult.member.email);  TestValidator.equals("owner display name matches", organization.owner.display_name, joinResult.member.display_name);  TestValidator.equals("created_at is string", typeof organization.created_at, "string");  TestValidator.equals("updated_at is string", typeof organization.updated_at, "string");  TestValidator.equals("deleted_at is null", organization.deleted_at, null);  TestValidator.predicate("organization is active", organization.deleted_at === null);}
