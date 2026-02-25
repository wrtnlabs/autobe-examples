import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // This test validates that the system prevents super administrator registration
  // with duplicate email addresses.
  // 1. Create the initial super administrator using the authorize utility.
  const adminConnection1: api.IConnection = { host: connection.host };
  const initialJoinOutput = await authorize_super_administrator_join(
    adminConnection1,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: "SuperSecret123!",
        href: "https://example.com/register",
        referrer: "https://referrer.com",
        ip: null,
      },
    },
  );
  typia.assert(initialJoinOutput);
  // 2. Attempt to register another super administrator with the same email.
  const adminConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email registration", async () => {
    await authorize_super_administrator_join(adminConnection2, {
      body: {
        email: initialJoinOutput.email, // same email to test duplicate rejection
        password: "AnotherSecret456$",
        href: "https://example.com/register2",
        referrer: "https://referrer2.com",
        ip: null,
      },
    });
  });
}
