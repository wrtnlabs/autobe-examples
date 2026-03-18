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

export async function test_api_organization_update_selected_context_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) member join to obtain authenticated context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssword123!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: "https://example.com/logo.png",
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/ref",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2) First update (full set)
  const update1 = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_url: "https://example.com/logo2.png",
    currency_code: "EUR",
    timezone: "America/New_York",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IErpHrmTimeTrackingOrganization.IUpdate;
  const firstUpdate =
    await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
      memberConnection,
      { body: update1 },
    );
  typia.assert(firstUpdate);
  const baselineId = firstUpdate.id;
  const baselineCreatedAt = firstUpdate.created_at;
  const baselineUpdatedAt = firstUpdate.updated_at;
  TestValidator.equals(
    "id matches update response",
    firstUpdate.id,
    baselineId,
  );
  TestValidator.equals(
    "created_at matches update response",
    firstUpdate.created_at,
    baselineCreatedAt,
  );
  // 3) Second update (subset: timezone + fiscal_start_month)
  const update2Timezone = "Europe/London";
  const update2Fiscal = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >();
  const secondUpdate =
    await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
      memberConnection,
      {
        body: {
          timezone: update2Timezone,
          fiscal_start_month: update2Fiscal,
        } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals("id remains unchanged", secondUpdate.id, baselineId);
  TestValidator.equals(
    "created_at remains unchanged",
    secondUpdate.created_at,
    baselineCreatedAt,
  );
  TestValidator.predicate(
    "updated_at changes (is greater)",
    secondUpdate.updated_at > baselineUpdatedAt,
  );
  // Unspecified fields remain unchanged
  TestValidator.equals("name unchanged", secondUpdate.name, firstUpdate.name);
  TestValidator.equals(
    "description unchanged",
    secondUpdate.description,
    firstUpdate.description,
  );
  TestValidator.equals(
    "logo_url unchanged",
    secondUpdate.logo_url,
    firstUpdate.logo_url,
  );
  TestValidator.equals(
    "currency_code unchanged",
    secondUpdate.currency_code,
    firstUpdate.currency_code,
  );
  // Specified fields updated
  TestValidator.equals(
    "timezone updated",
    secondUpdate.timezone,
    update2Timezone,
  );
  TestValidator.equals(
    "fiscal_start_month updated",
    secondUpdate.fiscal_start_month,
    update2Fiscal,
  );
  // Also validate that first full update fields match request
  TestValidator.equals("name matches request", firstUpdate.name, update1.name!);
  TestValidator.equals(
    "description matches request",
    firstUpdate.description,
    update1.description!,
  );
  TestValidator.equals(
    "logo_url matches request",
    firstUpdate.logo_url,
    update1.logo_url!,
  );
  TestValidator.equals(
    "currency_code matches request",
    firstUpdate.currency_code,
    update1.currency_code!,
  );
  TestValidator.equals(
    "timezone matches request",
    firstUpdate.timezone,
    update1.timezone!,
  );
  TestValidator.equals(
    "fiscal_start_month matches request",
    firstUpdate.fiscal_start_month,
    update1.fiscal_start_month!,
  );
}
