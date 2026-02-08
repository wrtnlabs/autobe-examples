import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_discussion_board_section_update_authorized_validations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = { Authorization: `Bearer ${auth.token.access}` };
  // 2. Create initial section to update
  const originalSectionRaw =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  const originalSection = originalSectionRaw as unknown as (IDiscussionBoardSection & { id: string, name: string, description: string });
  typia.assert(originalSection);
  // 3. Scenario 1: Successful update of a section
  const updatedName1 = originalSection.name + " Updated";
  const updatedDescription1 =
    originalSection.description + " Extended description.";
  const updateBody1: IDiscussionBoardSection.IUpdate = {
    name: updatedName1,
    description: updatedDescription1,
  };
  const updatedSectionRaw =
    await api.functional.discussionBoard.administrator.sections.update(
      adminConnection,
      {
        sectionId: originalSection.id,
        body: updateBody1,
      },
    );
  const updatedSection = updatedSectionRaw as unknown as (IDiscussionBoardSection & { name: string, description: string });
  typia.assert(updatedSection);
  TestValidator.equals(
    "Section name updated",
    updatedSection.name,
    updatedName1,
  );
  TestValidator.equals(
    "Section description updated",
    updatedSection.description,
    updatedDescription1,
  );
  // 4. Scenario 2: Attempt to update section with duplicate name
  // Create another section to have a conflicting name
  const anotherSectionRaw =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  const anotherSection = anotherSectionRaw as unknown as (IDiscussionBoardSection & { name: string });
  typia.assert(anotherSection);
  // Attempt to update originalSection with anotherSection's name (should fail)
  const updateBody2: IDiscussionBoardSection.IUpdate = {
    name: anotherSection.name, // duplicate name
    description: "Trying to duplicate name",
  };
  await TestValidator.error(
    "Duplicate section name update should fail",
    async () => {
      await api.functional.discussionBoard.administrator.sections.update(
        adminConnection,
        {
          sectionId: originalSection.id,
          body: updateBody2,
        },
      );
    },
  );
  // 5. Scenario 3: Updating non-existent section ID
  const fakeSectionId = typia.random<string & tags.Format<"uuid">>();
  const updateBody3: IDiscussionBoardSection.IUpdate = {
    name: "Non-existent Section",
    description: "This section does not exist.",
  };
  await TestValidator.error(
    "Updating non-existent section should fail",
    async () => {
      await api.functional.discussionBoard.administrator.sections.update(
        adminConnection,
        {
          sectionId: fakeSectionId,
          body: updateBody3,
        },
      );
    },
  );
}
