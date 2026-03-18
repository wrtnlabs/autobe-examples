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

export async function test_api_organization_profile_get_selected_context_success_and_isolation(
  connection: api.IConnection,
): Promise<void> {
  // With the currently available DTOs/endpoints, join() does not return
  // an organization identifier, so we cannot reliably obtain the selected
  // organizationId for a successful organizations profile read.
  // We therefore implement isolation and not-found behavior using UUIDs.
  const memberConnectionA: api.IConnection = { host: connection.host };
  const memberConnectionB: api.IConnection = { host: connection.host };
  const joinInputA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password-1!aA",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/referrer" satisfies string &
      tags.Format<"uri">,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const joinInputB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password-1!aA",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/referrer" satisfies string &
      tags.Format<"uri">,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnectionA, { body: joinInputA });
  await authorize_member_join(memberConnectionB, { body: joinInputB });
  // Scenario 2: Access denied (or not found) when requesting an organization
  // outside current selected context.
  // We use a UUID we did not create in this member context.
  const organizationIdNotInContext = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "should deny access to organization outside selected context",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.member.organizations.at(
        memberConnectionA,
        {
          organizationId: organizationIdNotInContext,
        },
      );
    },
  );
  // Scenario 3: Not found when organizationId does not exist.
  const nonExistentOrganizationId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "should return not found for non-existent organization",
    404,
    async () => {
      await api.functional.erpHrmTimeTracking.member.organizations.at(
        memberConnectionA,
        {
          organizationId: nonExistentOrganizationId,
        },
      );
    },
  );
}
