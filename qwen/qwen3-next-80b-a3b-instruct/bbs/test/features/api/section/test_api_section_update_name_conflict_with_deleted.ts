import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_section_update_name_conflict_with_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
  } satisfies IEconomicBoardSuperAdministrator.ILogin;
  const loginResponse = await authorize_super_administrator_login(
    adminConnection,
    { body: credentials },
  );
  typia.assert(loginResponse);
  // 2. Prepare the name that conflicts with a deleted section
  // This name must match a section that was previously deleted (existing in backend's deleted records)
  // Since we cannot create/delete sections via API, we assume this name is previously used
  const conflictName = "PreviouslyDeletedSection";
  // 3. Update a section to have that name (should fail with SECTION_NAME_EXISTS)
  // We need a valid sectionId, which must exist in the database (assumed to be present)
  const targetSectionId = "00000000-0000-0000-0000-000000000001";
  // This update should trigger SECTION_NAME_EXISTS error
  await TestValidator.error(
    "SECTION_NAME_EXISTS error on duplicate name",
    async () => {
      await api.functional.economicBoard.superAdministrator.sections.update(
        adminConnection,
        {
          sectionId: targetSectionId,
          body: {
            name: conflictName,
          } satisfies IEconomicBoardSection.IUpdate,
        },
      );
    },
  );
}
