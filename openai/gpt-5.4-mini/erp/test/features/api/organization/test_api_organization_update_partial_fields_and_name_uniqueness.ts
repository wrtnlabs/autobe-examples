import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_update_partial_fields_and_name_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const organizationId = authorized.id;
  const body = {
    name: RandomGenerator.name(),
    description: null,
    logoImageUrl: null,
    currency: RandomGenerator.pick(["USD", "KRW", "EUR"] as const),
    timezone: RandomGenerator.pick([
      "Asia/Seoul",
      "UTC",
      "America/New_York",
    ] as const),
    fiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  const updated =
    await api.functional.hrmTimeTracking.member.organizations.update(
      memberConnection,
      {
        organizationId,
        body,
      },
    );
  typia.assert(updated);
  TestValidator.equals("organization id preserved", updated.id, organizationId);
  TestValidator.equals("organization name updated", updated.name, body.name);
  TestValidator.equals(
    "description updated",
    updated.description,
    body.description,
  );
  TestValidator.equals(
    "logo image updated",
    updated.logoImageUrl,
    body.logoImageUrl,
  );
  TestValidator.equals("currency updated", updated.currency, body.currency);
  TestValidator.equals("timezone updated", updated.timezone, body.timezone);
  TestValidator.equals(
    "fiscal start month updated",
    updated.fiscalStartMonth,
    body.fiscalStartMonth,
  );
}
