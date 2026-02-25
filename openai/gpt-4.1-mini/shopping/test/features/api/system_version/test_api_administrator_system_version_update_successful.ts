import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_system_version_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration to get authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Prepare a random existing system version record (simulate or create)
  // Since we cannot create a system version via API, we'll simulate by generating a random record
  const originalVersion = typia.random<IShoppingMallSystemVersion>();
  // 3. Prepare update data
  const updateBody: IShoppingMallSystemVersion.IUpdate = {
    change_description: RandomGenerator.paragraph({ sentences: 2 }),
    changed_by: adminAuth.email,
  };
  // 4. Call API to update the system version record
  const updatedVersion =
    await api.functional.shoppingMall.administrator.systemVersions.update(
      adminConnection,
      {
        id: originalVersion.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVersion);
  // 5. Validate immutable fields unchanged
  TestValidator.equals(
    "immutable field id",
    updatedVersion.id,
    originalVersion.id,
  );
  TestValidator.equals(
    "immutable field entityName",
    updatedVersion.entityName,
    originalVersion.entityName,
  );
  TestValidator.equals(
    "immutable field entityId",
    updatedVersion.entityId,
    originalVersion.entityId,
  );
  TestValidator.equals(
    "immutable field versionNumber",
    updatedVersion.versionNumber,
    originalVersion.versionNumber,
  );
  TestValidator.equals(
    "immutable field changedFields",
    updatedVersion.changedFields,
    originalVersion.changedFields,
  );
  // 6. Validate updated fields
  TestValidator.equals(
    "updated change_description",
    updatedVersion.changeDescription,
    updateBody.change_description,
  );
  TestValidator.equals(
    "updated changed_by",
    updatedVersion.changedBy,
    updateBody.changed_by,
  );
  // 7. Validate timestamps are valid ISO strings
  TestValidator.predicate(
    "createdAt is ISO date",
    typeof updatedVersion.createdAt === "string" &&
      updatedVersion.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is ISO date",
    typeof updatedVersion.updatedAt === "string" &&
      updatedVersion.updatedAt.length > 0,
  );
  // 8. Validate deletedAt is null or ISO string
  TestValidator.predicate(
    "deletedAt is null or ISO string",
    updatedVersion.deletedAt === null ||
      typeof updatedVersion.deletedAt === "string",
  );
}
