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

export async function test_api_organization_create_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // Create authenticated member via join
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Passw0rd!";
  const organizationName = `org-${RandomGenerator.alphabets(12)}`;
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: organizationName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/entry",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(auth);
  // Create first organization with the chosen unique name
  const first =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: organizationName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(first);
  const originalId = first.id;
  const originalName = first.name;
  // Attempt to create duplicate organization name with different other fields
  await TestValidator.error(
    "duplicate organization name should be rejected with conflict-style uniqueness error",
    async () => {
      try {
        await generate_random_erp_hrm_time_tracking_member_organizations_create(
          memberConnection,
          {
            body: {
              name: originalName,
              description: RandomGenerator.paragraph({ sentences: 3 }),
              logo_url: "https://example.com/logo.png",
              currency_code: "KRW",
              timezone: "UTC",
              fiscal_start_month: 12,
            } satisfies IErpHrmTimeTrackingOrganization.ICreate,
          },
        );
        throw new Error(
          "Expected duplicate name conflict, but request succeeded.",
        );
      } catch (exp) {
        if (!typia.is<{ message: string }>(exp)) throw exp;
        const message = exp.message;
        // Assert deterministic conflict-style message without checking exact status code.
        await TestValidator.predicate(
          "error message should indicate duplicate name / uniqueness conflict",
          () => {
            const lower = message.toLowerCase();
            return (
              lower.includes("duplicate") ||
              lower.includes("already") ||
              lower.includes("unique") ||
              lower.includes("constraint")
            );
          },
        );
        // Ensure the failure response does not leak the already-known organization id
        await TestValidator.notEquals(
          "error message must not disclose original organization id",
          message,
          originalId,
        );
        // Also ensure message does not contain it as substring
        await TestValidator.predicate(
          "error message must not contain original organization id substring",
          !message.includes(originalId),
        );
        throw exp;
      }
    },
  );
  // (b) First organization remains unchanged.
  // Without a GET endpoint, we validate non-mutation by asserting that the
  // server continues to treat the same name as a duplicate and does not
  // accept recreations with same name.
  await TestValidator.error(
    "first organization should remain intact (duplicate name still rejected)",
    async () => {
      await generate_random_erp_hrm_time_tracking_member_organizations_create(
        memberConnection,
        {
          body: {
            name: originalName,
            description: first.description,
            logo_url: null,
            currency_code: first.currency_code,
            timezone: first.timezone,
            fiscal_start_month: first.fiscal_start_month,
          } satisfies IErpHrmTimeTrackingOrganization.ICreate,
        },
      );
    },
  );
}
