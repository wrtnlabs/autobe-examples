import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_definitions_get_success_by_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join to establish selected organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd-" + RandomGenerator.alphaNumeric(10);
  const joinPayload = {
    email,
    password,
    organizationName: RandomGenerator.name(2),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinPayload,
  });
  typia.assert(authorized);
  const token: IAuthorizationToken = authorized.token;
  typia.assert(token);
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: token.access,
    },
  };
  // 2) Retrieve an existing report definition for the selected organization.
  // Since no list/search endpoint is available in the provided materials,
  // retry a few times with different UUIDs until a successful record is found.
  let first: IErpHrmTimeTrackingReportDefinition | undefined;
  let reportDefinitionId: (string & tags.Format<"uuid">) | undefined;
  const attempts = 5;
  for (let i = 0; i < attempts; i++) {
    const candidateId = typia.random<string & tags.Format<"uuid">>();
    try {
      const response =
        await api.functional.erpHrmTimeTracking.reportDefinitions.at(
          authenticatedConnection,
          {
            reportDefinitionId: candidateId,
          },
        );
      typia.assert(response);
      first = response;
      reportDefinitionId = candidateId;
      break;
    } catch (err) {
      // Keep trying with a different UUID candidate.
    }
  }
  if (!first || !reportDefinitionId) {
    throw new Error(
      "Failed to retrieve a report definition by ID within the selected organization after retries.",
    );
  }
  // Read-only behavior: calling again returns consistent fields
  const second = await api.functional.erpHrmTimeTracking.reportDefinitions.at(
    authenticatedConnection,
    {
      reportDefinitionId,
    },
  );
  typia.assert(second);
  // 3) Business validations (non-type)
  TestValidator.equals("id matches", second.id, first.id);
  TestValidator.equals("code matches", second.code, first.code);
  TestValidator.equals("name matches", second.name, first.name);
  TestValidator.equals(
    "description matches",
    second.description ?? null,
    first.description ?? null,
  );
  TestValidator.equals(
    "report_type matches",
    second.report_type,
    first.report_type,
  );
  TestValidator.equals("is_active matches", second.is_active, first.is_active);
  TestValidator.equals("deleted_at should be null", first.deleted_at, null);
  // Ensure timestamps are stable between calls
  TestValidator.equals(
    "created_at matches",
    second.created_at,
    first.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    second.updated_at,
    first.updated_at,
  );
  // Ensure dimensions and filters are present and stable
  TestValidator.equals(
    "dimensions matches",
    second.dimensions,
    first.dimensions,
  );
  TestValidator.equals("filters matches", second.filters, first.filters);
}
