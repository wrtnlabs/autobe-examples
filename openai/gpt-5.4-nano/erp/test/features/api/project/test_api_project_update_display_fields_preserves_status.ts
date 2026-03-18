import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_update_display_fields_preserves_status(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      organizationLogoUrl: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = { Authorization: auth.token.access };
  // No project fixture/setup functions are provided in the prompt.
  // Therefore, we must validate update semantics using an existing updatable project ID.
  // The test environment is expected to provide a project ID through connection headers or other harness mechanisms.
  const projectId = authorizedConnection.headers?.["x-test-project-id"];
  TestValidator.predicate(
    "projectId must be provided by test harness",
    () => typeof projectId === "string" && projectId.length > 0,
  );
  const projectIdSafe = projectId as string satisfies string;
  const before = await api.functional.erpHrmTimeTracking.member.projects.update(
    authorizedConnection,
    {
      // This API requires a body with name and color; we will immediately update and re-fetch via the response.
      // Since no GET endpoint is provided, we treat the returned record as the "before" state.
      projectId: projectIdSafe as string & tags.Format<"uuid">,
      body: {
        name: RandomGenerator.name(),
        color: "#" + RandomGenerator.alphabets(6),
      } satisfies IErpHrmTimeTrackingProject.IUpdate,
    },
  );
  typia.assert(before);
  const updatedName = RandomGenerator.name();
  const updatedColor = "#" + RandomGenerator.alphabets(6);
  const after = await api.functional.erpHrmTimeTracking.member.projects.update(
    authorizedConnection,
    {
      projectId: projectIdSafe as string & tags.Format<"uuid">,
      body: {
        name: updatedName,
        color: updatedColor,
      } satisfies IErpHrmTimeTrackingProject.IUpdate,
    },
  );
  typia.assert(after);
  TestValidator.equals("name updated", after.name, updatedName);
  TestValidator.equals("color updated", after.color, updatedColor);
  TestValidator.equals(
    "status preserved when omitted",
    after.status,
    before.status,
  );
}
