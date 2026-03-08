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

export async function test_api_section_update_name_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: `admin${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      display_name: "Super Admin",
      bio: "Test super admin for section management",
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create two test sections
  const section1 =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: `Section Alpha ${RandomGenerator.alphaNumeric(4)}`,
          description: "Original description for Section Alpha",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section1);
  const section2 =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: `Section Beta ${RandomGenerator.alphaNumeric(4)}`,
          description: "Original description for Section Beta",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section2);
  // 3. Try to update Section 1's name to match Section 2's name (should fail)
  const updateBody = {
    name: section2.name,
  } satisfies IDiscussionBoardSection.IUpdate;
  await TestValidator.error(
    "should fail with duplicate section name uniqueness constraint",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.update(
        superAdminConnection,
        {
          sectionId: section1.id,
          body: updateBody,
        },
      );
    },
  );
  // 4. Verify Section 1's name remains unchanged by performing a safe partial update
  const newDescription1 = `Updated description for Section Alpha ${RandomGenerator.alphabets(8)}`;
  const updatedSection1 =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: section1.id,
        body: {
          description: newDescription1,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection1);
  TestValidator.equals(
    "section1 name unchanged after failed update attempt",
    updatedSection1.name,
    section1.name,
  );
  // 5. Verify Section 2's data remains unchanged
  const newDescription2 = `Updated description for Section Beta ${RandomGenerator.alphabets(8)}`;
  const updatedSection2 =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: section2.id,
        body: {
          description: newDescription2,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection2);
  TestValidator.equals(
    "section2 name unchanged after update",
    updatedSection2.name,
    section2.name,
  );
}
