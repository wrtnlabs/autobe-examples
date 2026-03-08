import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_update_by_superadmin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const generatedPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: generatedPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create authorized connection for section operations
  const sectionConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_login(sectionConnection, {
    body: {
      email: superAdmin.email,
      password: generatedPassword,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(authorized);
  // 3. Create a test section
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      sectionConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  const originalCreatedAt = section.created_at;
  const originalUpdatedAt = section.updated_at;
  // 4. Prepare new values for update
  const newSectionName = RandomGenerator.name(3);
  const newSectionDescription = RandomGenerator.paragraph({ sentences: 7 });
  // 5. Update the section
  const updatedSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      sectionConnection,
      {
        sectionId: section.id,
        body: {
          name: newSectionName,
          description: newSectionDescription,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // 6. Verify the update
  TestValidator.equals(
    "section name updated",
    updatedSection.name,
    newSectionName,
  );
  TestValidator.equals(
    "section description updated",
    updatedSection.description,
    newSectionDescription,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedSection.updated_at !== originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedSection.created_at,
    originalCreatedAt,
  );
}
