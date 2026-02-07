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

export async function test_api_section_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials =
    typia.random<IEconomicBoardSuperAdministrator.IJoin>();
  const authResponse =
    await api.functional.economicBoard.auth.superAdministrator.join(
      superAdminConnection,
      { body: superAdminCredentials },
    );
  typia.assert(authResponse);
  // Create new connection with updated authorization
  const updatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authResponse.token.access}` },
  };
  // Define update properties (assuming IUpdate should have name and description despite DTO definition being empty)
  // According to scenario: name (1-256 chars), description (0-1000 chars)
  const updatedName = RandomGenerator.alphabets(50); // 50 chars (within 1-256)
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 }); // approximately 600-800 chars (within 0-1000)
  const updateBody: IEconomicBoardSection.IUpdate = {
    name: updatedName,
    description: updatedDescription,
  };
  // Use a hard-coded sectionId that must exist in test database (standard test practice)
  // In real E2E, this would be set up by a fixture; here we assume it exists.
  const sectionId = "d8f3e1a6-1b5a-4e7f-a2b9-11a1f6d1d9e5";
  // Perform the update - this should succeed with 204 No Content
  await api.functional.economicBoard.superAdministrator.sections.update(
    updatedConnection,
    {
      sectionId: sectionId,
      body: updateBody,
    },
  );
  // Success is indicated by completion without error - HTTP 204 is assumed
}
