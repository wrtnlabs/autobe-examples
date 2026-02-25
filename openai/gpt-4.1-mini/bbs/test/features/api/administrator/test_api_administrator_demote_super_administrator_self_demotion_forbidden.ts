import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDemotionResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDemotionResult";
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

export async function test_api_administrator_demote_super_administrator_self_demotion_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Scenario Description:
  // This test validates that a super administrator cannot demote themselves to a regular administrator.
  // It ensures the operation is rejected and the system integrity preserved by preventing self-demotion.
  // 1. Create a super admin and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IDiscussionBoardSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    });
  typia.assert(superAdmin);
  // Update superAdminConnection headers with the token for authenticated requests
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Attempt demotion of self
  const demoteResponse =
    await api.functional.discussionBoard.superAdministrator.administrator.demote.demoteAdministrator(
      superAdminConnection,
      { administratorId: superAdmin.id },
    );
  // 3. Validate the demotion request failed and self-demotion is forbidden
  typia.assert(demoteResponse);
  TestValidator.predicate(
    "demotion success flag should be false when self-demotion is attempted",
    demoteResponse.success === false,
  );
  // Optionally check there is a meaningful message about self-demotion being forbidden
  if (demoteResponse.message !== undefined) {
    TestValidator.predicate(
      "demotion response message mentions forbidden self-demotion",
      /forbid|self demotion|cannot demote yourself/i.test(
        demoteResponse.message,
      ),
    );
  }
}
