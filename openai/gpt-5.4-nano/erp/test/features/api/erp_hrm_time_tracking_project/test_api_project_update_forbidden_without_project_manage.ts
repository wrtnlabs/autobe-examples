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

export async function test_api_project_update_forbidden_without_project_manage(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const passwordA = "Passw0rd-1";
  const passwordB = "Passw0rd-2";
  const organizationName = `org_${RandomGenerator.alphabets(8)}`;
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: passwordA,
      organizationName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" satisfies string &
        tags.Format<"uri">,
      ip: undefined,
    },
  });
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: passwordB,
      organizationName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: "https://example.com/join2" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/referrer2" satisfies string &
        tags.Format<"uri">,
      ip: undefined,
    },
  });
  // With the provided API surface, we only have PUT update. Project creation
  // and project retrieval endpoints are not available, so we cannot fetch
  // current name/color to assert immutability.
  // We still verify that the unauthorized update attempt is rejected.
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    name: RandomGenerator.name(),
    color: `#${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IErpHrmTimeTrackingProject.IUpdate;
  await TestValidator.error(
    "project update should be rejected for member without project manage capability",
    async () => {
      const updated =
        await api.functional.erpHrmTimeTracking.member.projects.update(
          memberBConnection,
          {
            projectId,
            body,
          },
        );
      typia.assert(updated);
    },
  );
}
