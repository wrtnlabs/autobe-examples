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

export async function test_api_report_definition_dimension_retrieve_reject_dimension_belongs_to_other_report(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>().toLowerCase();
  const password = "Passw0rd!";
  const organizationName = "org_" + typia.random<string>();
  const organizationDescription = "desc_" + typia.random<string>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName,
      organizationDescription,
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: ("https://example.com/" + typia.random<string>()) satisfies string,
      referrer: ("https://example.com/ref/" +
        typia.random<string>()) satisfies string,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: authorized.token.access,
  };
  // Missing API/utility functions for creating report definitions and
  // report definition dimensions in the provided materials.
  // Without creating rd1/rd2 and their dimensions, we cannot arrange the
  // mismatched association test data deterministically.
  throw new Error(
    "Cannot complete test: reportDefinition/dimension creation APIs are not provided in the current materials.",
  );
}
