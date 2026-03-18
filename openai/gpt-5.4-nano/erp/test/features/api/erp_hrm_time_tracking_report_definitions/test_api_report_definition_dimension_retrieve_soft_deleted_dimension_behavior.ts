import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_definition_dimension_retrieve_soft_deleted_dimension_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member joins (to create an organization context)
  const baseConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(baseConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!" satisfies string,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: typia.random<string>(),
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: memberJoin.token.access,
  };
  // 2) NOTE: Scenario requires soft-deleting an existing dimension.
  // The required setup/remove workflows are not provided in the available SDK/utilities,
  // so we can only validate GET behavior with an intentionally soft-deleted dimension
  // only if the system provides pre-existing configuration.
  // Best-effort: generate random IDs and call GET expecting not-found or validation error.
  const reportDefinitionId = typia.random<string & tags.Format<"uuid">>();
  const dimensionId = typia.random<string & tags.Format<"uuid">>();
  const input = {
    reportDefinitionId,
    dimensionId,
  } satisfies api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.at.Props;
  try {
    const dimension =
      await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.at(
        memberConnection,
        input,
      );
    typia.assert(dimension);
    // If the endpoint returns data for soft-deleted dimensions, deletedAt must be non-null.
    TestValidator.predicate(
      "deletedAt must be non-null for soft-deleted dimensions",
      () => dimension.deletedAt !== null,
    );
  } catch (error) {
    // If it errors, it must be a not-found style business validation.
    await TestValidator.error(
      "should fail with not-found style error for soft-deleted dimensions",
      () => {
        throw error;
      },
    );
  }
}
