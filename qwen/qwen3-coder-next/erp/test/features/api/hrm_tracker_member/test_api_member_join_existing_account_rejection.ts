import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_existing_account_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial member account
  const memberConnection1: api.IConnection = { host: connection.host };
  const initialMember = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  typia.assert(initialMember);
  // Step 2: Attempt to register duplicate account with same email
  await TestValidator.httpError(
    "should reject duplicate email registration",
    409,
    async () => {
      await authorize_member_join(connection, {
        body: {
          email: initialMember.email,
          password: "DifferentPassword123!",
          display_name: RandomGenerator.name(),
          phone: null,
        },
      });
    },
  );
}
