import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_cross_org_data_isolation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate Member A (requesting party with session context)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberA);
  // 2. Create and authenticate Member B (target member in different organization)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberB);
  // 3. Attempt to retrieve Member B's profile using Member A's session context
  // This should fail with 403 Forbidden due to organization context scoping
  await TestValidator.httpError(
    "cross-organization member access returns 403 Forbidden",
    403,
    async () => {
      await api.functional.hrmPlatform.members.at(memberAConnection, {
        memberId: memberB.id,
      });
    },
  );
}
