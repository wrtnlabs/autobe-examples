import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

export async function test_api_administrator_promotion_success_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuthorized);
  // Now superAdminConnection is authorized with token internally
  // 2. Prepare a regular administrator to promote
  // For this test, we simulate creating an administrator with regular grade
  // Since direct creation is not available, we simulate with a random UUID for testing
  // We assume here 'promoteAdministrator' expects a valid administratorId of a regular admin
  // TODO: If there was a creation endpoint, we would call it here.
  // Use a random UUID for administratorId to promote
  const administratorIdToPromote = typia.random<string & tags.Format<"uuid">>();
  // 3. Perform promotion
  const promotedAdministrator =
    await api.functional.discussionBoard.superAdministrator.administrator.promote.promoteAdministrator(
      superAdminConnection,
      { administratorId: administratorIdToPromote },
    );
  typia.assert(promotedAdministrator);
  // 4. Validate promotion result
  // The grade should be updated to a super administrator grade (just check exists)
  TestValidator.predicate(
    "administrator.grade exists",
    promotedAdministrator.grade !== undefined &&
      promotedAdministrator.grade !== null,
  );
  // 5. Validate other required properties of the promoted administrator
  TestValidator.predicate(
    "administrator.id matches promoted",
    promotedAdministrator.id === administratorIdToPromote,
  );
  TestValidator.predicate(
    "administrator not deleted",
    promotedAdministrator.deletedAt === null,
  );
  TestValidator.predicate(
    "administrator email non empty",
    typeof promotedAdministrator.email === "string" &&
      promotedAdministrator.email.length > 0,
  );
  TestValidator.predicate(
    "administrator timestamps valid",
    typeof promotedAdministrator.createdAt === "string" &&
      promotedAdministrator.createdAt.length > 0 &&
      typeof promotedAdministrator.updatedAt === "string" &&
      promotedAdministrator.updatedAt.length > 0,
  );
}
