import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";

export async function test_api_organization_update_name_uniqueness_no_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join => create organization A in the member context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `Pwd_${RandomGenerator.alphabets(12)}`,
    organizationName: `Org A ${RandomGenerator.alphabets(10)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: RandomGenerator.pick([
      "USD",
      "KRW",
      "EUR",
      "JPY",
    ] as const),
    organizationTimezone: RandomGenerator.pick([
      "Asia/Seoul",
      "UTC",
      "America/New_York",
      "Europe/Berlin",
    ] as const),
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: `https://example.com/join/${RandomGenerator.alphaNumeric(8)}` satisfies string &
      tags.Format<"uri">,
    referrer:
      `https://example.com/ref/${RandomGenerator.alphaNumeric(8)}` satisfies string &
        tags.Format<"uri">,
  };
  await authorize_member_join(memberConnection, { body: joinBody });
  const orgAOriginalName = joinBody.organizationName;
  const orgADescriptionOriginal = joinBody.organizationDescription;
  const orgACurrencyOriginal = joinBody.organizationCurrencyCode;
  const orgATimezoneOriginal = joinBody.organizationTimezone;
  const orgAFiscalStartMonthOriginal = joinBody.organizationFiscalStartMonth;
  // Establish a known updated_at baseline for org A before the conflicting attempt.
  const baselineDescription = `Baseline desc ${RandomGenerator.paragraph({ sentences: 1 })}`;
  const baselineUpdate =
    await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
      memberConnection,
      {
        body: {
          description: baselineDescription,
        } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
      },
    );
  typia.assert(baselineUpdate);
  const updatedAtBeforeConflict = baselineUpdate.updated_at;
  // 2) Create organization B in the same member context
  const orgB =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `Org B ${RandomGenerator.alphabets(10)}`,
        },
      },
    );
  typia.assert(orgB);
  const orgBName = orgB.name;
  // 4) Attempt to rename current selected org (expected: org A) to org B's name and mutate other fields too
  const rejectedAttemptBody: IErpHrmTimeTrackingOrganization.IUpdate = {
    name: orgBName,
    description: `Rejected desc ${RandomGenerator.paragraph({ sentences: 1 })}`,
    currency_code: RandomGenerator.pick(["USD", "KRW", "EUR", "JPY"] as const),
    timezone: RandomGenerator.pick([
      "Asia/Seoul",
      "UTC",
      "America/New_York",
      "Europe/Berlin",
    ] as const),
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  };
  await TestValidator.error(
    "should reject global unique name conflict without partial updates",
    async () => {
      await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
        memberConnection,
        { body: rejectedAttemptBody },
      );
    },
  );
  // 6) After rejection, perform safe update (description only)
  const safeDescription = `Safe desc ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const afterConflictUpdate =
    await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
      memberConnection,
      {
        body: {
          description: safeDescription,
        } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
      },
    );
  typia.assert(afterConflictUpdate);
  // 6) Validate no partial updates from rejected attempt
  TestValidator.equals(
    "name unchanged after rejected update",
    afterConflictUpdate.name,
    orgAOriginalName,
  );
  TestValidator.equals(
    "description equals safe update (not rejected desc)",
    afterConflictUpdate.description,
    safeDescription,
  );
  TestValidator.equals(
    "currency_code unchanged after rejected update",
    afterConflictUpdate.currency_code,
    orgACurrencyOriginal,
  );
  TestValidator.equals(
    "timezone unchanged after rejected update",
    afterConflictUpdate.timezone,
    orgATimezoneOriginal,
  );
  TestValidator.equals(
    "fiscal_start_month unchanged after rejected update",
    afterConflictUpdate.fiscal_start_month,
    orgAFiscalStartMonthOriginal,
  );
  // 7) updated_at should not have advanced because of the rejected update
  TestValidator.notEquals(
    "updated_at should advance only on successful update",
    updatedAtBeforeConflict,
    afterConflictUpdate.updated_at,
  );
}
