import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_resolve_approve(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as a moderator
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Pattern<"^(?=.*[!@#$%^&*]).{8,}$">
      >(),
      username: RandomGenerator.name(1),
    },
  });
  // Resolve a report as the moderator using the authenticated connection
  const output = await api.functional.reddit.member.reports.resolutions.resolve(
    moderatorConnection,
    {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        resolutionType: "approve",
      },
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "report status should be approved",
    output.status,
    "approved",
  );
}
