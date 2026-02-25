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

export async function test_api_super_administrator_retrieve_details_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a super administrator via join endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // 2) Retrieve super administrator details
  const superAdminDetails =
    await api.functional.discussionBoard.superAdministrators.at(
      superAdminConnection,
      { superAdministratorId: superAdminAuth.id },
    );
  typia.assert(superAdminDetails);
  // 3) Validate that the details correspond to the authenticated super administrator
  TestValidator.equals(
    "super administrator id matches",
    superAdminDetails.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "super administrator email matches",
    superAdminDetails.email,
    superAdminAuth.email,
  );
  TestValidator.equals(
    "super administrator displayName matches",
    superAdminDetails.displayName,
    superAdminAuth.displayName,
  );
  TestValidator.equals(
    "super administrator bio matches",
    superAdminDetails.bio,
    superAdminAuth.bio,
  );
  TestValidator.equals(
    "super administrator createdAt matches",
    superAdminDetails.createdAt,
    superAdminAuth.createdAt,
  );
  TestValidator.equals(
    "super administrator updatedAt matches",
    superAdminDetails.updatedAt,
    superAdminAuth.updatedAt,
  );
  TestValidator.equals(
    "super administrator deletedAt matches",
    superAdminDetails.deletedAt,
    superAdminAuth.deletedAt,
  );
}
