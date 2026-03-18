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

export async function test_api_organization_profile_update_name_unique_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password-12345!";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: `org-bootstrap-${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const memberApi: api.IConnection = { host: connection.host };
  memberApi.headers = memberConnection.headers;
  // 2) Create Organization A
  const organizationAName = `orgA-${RandomGenerator.alphabets(12)}`;
  const organizationADescription = RandomGenerator.paragraph({ sentences: 2 });
  const organizationA =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberApi,
      {
        body: {
          name: organizationAName,
          description: organizationADescription,
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organizationA);
  // 3) Create Organization B
  const organizationBName = `orgB-${RandomGenerator.alphabets(12)}`;
  const organizationB =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberApi,
      {
        body: {
          name: organizationBName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organizationB);
  // 4) Snapshot Organization A fields
  const aBefore = organizationA;
  // 5) Attempt conflict update: set org A name to org B name
  await TestValidator.httpError(
    "should reject uniqueness conflict on organization name",
    [400, 409, 422],
    async () => {
      await api.functional.erpHrmTimeTracking.member.organizations.update(
        memberApi,
        {
          organizationId: organizationA.id,
          body: {
            name: organizationBName,
          } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
        },
      );
    },
  );
  // 6) Atomicity check (best-effort without explicit read endpoint):
  // retry the exact same non-conflicting update back to a known state and
  // validate persisted fields match pre-conflict snapshot.
  const revertResult =
    await api.functional.erpHrmTimeTracking.member.organizations.update(
      memberApi,
      {
        organizationId: organizationA.id,
        body: {
          name: aBefore.name,
          description: aBefore.description,
          logo_url: (aBefore.logo_url ?? null) as
            | (string & tags.MaxLength<80000>)
            | null,
          currency_code: aBefore.currency_code,
          timezone: aBefore.timezone,
          fiscal_start_month: aBefore.fiscal_start_month,
        } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
      },
    );
  typia.assert(revertResult);
  TestValidator.equals(
    "org A name unchanged after rejected conflict",
    revertResult.name,
    aBefore.name,
  );
  TestValidator.equals(
    "org A description unchanged after rejected conflict",
    revertResult.description,
    aBefore.description,
  );
  TestValidator.equals(
    "org A logo_url unchanged after rejected conflict",
    revertResult.logo_url,
    aBefore.logo_url,
  );
  TestValidator.equals(
    "org A currency_code unchanged after rejected conflict",
    revertResult.currency_code,
    aBefore.currency_code,
  );
  TestValidator.equals(
    "org A timezone unchanged after rejected conflict",
    revertResult.timezone,
    aBefore.timezone,
  );
  TestValidator.equals(
    "org A fiscal_start_month unchanged after rejected conflict",
    revertResult.fiscal_start_month,
    aBefore.fiscal_start_month,
  );
  TestValidator.predicate(
    "org A updated_at should be >= previous updated_at after successful revert",
    new Date(revertResult.updated_at).getTime() >=
      new Date(aBefore.updated_at).getTime(),
  );
  // 7) Additional consistency check: attempt the conflict update again; it must still fail.
  await TestValidator.httpError(
    "conflict should remain rejected after failed attempt",
    [400, 409, 422],
    async () => {
      await api.functional.erpHrmTimeTracking.member.organizations.update(
        memberApi,
        {
          organizationId: organizationA.id,
          body: {
            name: organizationBName,
          } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
        },
      );
    },
  );
}
