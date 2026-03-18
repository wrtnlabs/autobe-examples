import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_wrong_password_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new member account with valid credentials
  const setupConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(setupConnection, {
    body: {
      email: "memberB@example.com",
      password: "CorrectPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(registeredMember);
  // 2. Verify login with wrong password is rejected
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login rejected for wrong password", async () => {
    await authorize_member_login(loginConnection, {
      body: {
        email: "memberB@example.com",
        password: "WrongPassword456!",
      },
    });
  });
  // 3. Verify account remains active (not locked after failed login)
  const accountConnection: api.IConnection = { host: connection.host };
  const accountAfterFailedLogin = await api_helper.functional.hrms.members.findById(
    accountConnection,
    { id: registeredMember.id },
  );
  typia.assert(accountAfterFailedLogin);
  TestValidator.equals(
    "account still active after failed login",
    accountAfterFailedLogin.deleted_at, // null = active
    null,
  );
}
// Helper function to access members endpoint
namespace api_helper {
  export namespace functional {
    export namespace hrms {
      export namespace members {
        export async function findById(
          conn: api.IConnection,
          props: {
            id: string;
          },
        ): Promise<IHrmsMember.ISummary> {
          const result = await fetch(`${conn.host}/hrms/members/${props.id}`, {
            headers: conn.headers as HeadersInit,
          });
          const data = await result.json();
          return data as IHrmsMember.ISummary;
        }
      }
    }
  }
}