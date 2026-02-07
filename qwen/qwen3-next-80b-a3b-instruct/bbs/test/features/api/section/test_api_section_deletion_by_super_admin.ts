import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_section_deletion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminConnection, {
    body: {} satisfies IEconomicBoardSuperAdministrator.IJoin,
  });
  // Create a section first (required for deletion test)
  // (Note: Since no section creation API is available in provided SDK, we assume section exists)
  // In a real system, we'd create via POST /sections, but it's not in provided functions
  // We must rely on an existing section, so we'll use a generated valid UUID
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Delete the section as superAdministrator
  await api.functional.economicBoard.superAdministrator.sections.erase(
    superAdminConnection,
    { sectionId },
  );
}
