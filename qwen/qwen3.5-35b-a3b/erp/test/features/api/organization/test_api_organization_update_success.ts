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

export async function test_api_organization_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (creates initial organization)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) as
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>)
        | undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Get initial organization ID from member
  const initialOrgId: string & tags.Format<"uuid"> = joinResult.member.id;
  // 3. Create authenticated connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joinResult.token.access,
  };
  // 4. Prepare updated organization data
  const updatedName = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedCurrency = "USD";
  const updatedTimezone = "Asia/Seoul";
  const updatedFiscalMonth = 4;
  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    currency: updatedCurrency,
    timezone: updatedTimezone,
    fiscal_start_month: updatedFiscalMonth,
  } satisfies IHrmPlatformOrganization.IUpdate;
  // 5. Update organization
  const updatedOrg =
    await api.functional.hrmPlatform.member.organizations.update(
      memberConnection,
      {
        organizationId: initialOrgId,
        body: updateBody,
      },
    );
  typia.assert(updatedOrg);
  // 6. Validate updated organization contains all updated fields
  TestValidator.equals(
    "organization name updated",
    updatedOrg.name,
    updatedName,
  );
  TestValidator.equals(
    "organization description updated",
    updatedOrg.description,
    updatedDescription,
  );
  TestValidator.equals(
    "organization currency updated",
    updatedOrg.currency,
    updatedCurrency,
  );
  TestValidator.equals(
    "organization timezone updated",
    updatedOrg.timezone,
    updatedTimezone,
  );
  TestValidator.equals(
    "organization fiscal month updated",
    updatedOrg.fiscal_start_month,
    updatedFiscalMonth,
  );
  // 7. Validate organization has required fields
  TestValidator.predicate(
    "organization has owner reference",
    updatedOrg.owner.id !== "",
  );
  TestValidator.predicate(
    "organization has created timestamp",
    updatedOrg.created_at !== "",
  );
  TestValidator.predicate(
    "organization has updated timestamp",
    updatedOrg.updated_at !== "",
  );
  TestValidator.equals(
    "organization deleted_at is null",
    updatedOrg.deleted_at,
    null,
  );
  // 8. Validate updated_at is more recent than created_at
  const createdDate = new Date(updatedOrg.created_at);
  const updatedDate = new Date(updatedOrg.updated_at);
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedDate > createdDate,
  );
}
