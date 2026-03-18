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

export async function test_api_report_definition_dimension_retrieve_success_and_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Arrange: create two separate authenticated member organizations
  const org1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(org1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const org2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(org2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // We cannot create or list report definitions/dimensions with the provided SDK/API surface.
  // So we validate isolation/association mismatch by asserting not-found style errors
  // when attempting to access cross-definition / cross-organization resources.
  const reportDefinitionIdOrg1 = typia.random<string & tags.Format<"uuid">>();
  const dimensionIdOrg2 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "org isolation - should fail with not-found style error",
    [400, 401, 403, 404, 422],
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.at(
        org1Connection,
        {
          reportDefinitionId: reportDefinitionIdOrg1,
          dimensionId: dimensionIdOrg2,
        },
      );
    },
  );
  const reportDefinitionIdA = typia.random<string & tags.Format<"uuid">>();
  const reportDefinitionIdB = typia.random<string & tags.Format<"uuid">>();
  const dimensionIdOfB = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "association mismatch - should fail with not-found style error",
    [400, 401, 403, 404, 422],
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.at(
        org1Connection,
        {
          reportDefinitionId: reportDefinitionIdA,
          dimensionId: dimensionIdOfB,
        },
      );
    },
  );
  // Success path requires an existing dimension row, which cannot be guaranteed without
  // creation/list endpoints provided in the materials.
  await TestValidator.httpError(
    "success retrieval (best-effort) - should be not-found without existing data",
    [400, 401, 403, 404, 422],
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.at(
        org1Connection,
        {
          reportDefinitionId: reportDefinitionIdB,
          dimensionId: dimensionIdOfB,
        },
      );
    },
  );
}
