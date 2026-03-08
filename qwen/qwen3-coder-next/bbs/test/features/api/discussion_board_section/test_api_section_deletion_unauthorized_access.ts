import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test unauthorized section deletion scenario for the Discussion Board API.
 * Validates that only super administrators can delete sections.
 * 1. Create super admin account and authenticate
 * 2. Create regular member account and authenticate
 * 3. Create a section using super admin credentials
 * 4. Attempt to delete section with member credentials (should fail with 403)
 * 5. Verify section still exists by attempting deletion again and confirming it fails
 */
export async function test_api_section_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create and authenticate member (non-admin)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Create a section using super admin
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 4. Attempt to delete section with member credentials (should fail with 403 Forbidden)
  await TestValidator.httpError(
    "member should not be able to delete section",
    403,
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.erase(
        memberConnection,
        {
          sectionId: section.id,
        },
      );
    },
  );
  // 5. Verify section still exists by attempting deletion again with member credentials
  await TestValidator.httpError(
    "section still exists - member deletion attempt should fail again",
    403,
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.erase(
        memberConnection,
        {
          sectionId: section.id,
        },
      );
    },
  );
  // 6. Verify section integrity by retrieving with super admin and checking properties
  const retrievedSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: section.name,
          description: section.description,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(retrievedSection);
  TestValidator.equals(
    "section name matches original",
    retrievedSection.name,
    section.name,
  );
  TestValidator.equals(
    "section description matches original",
    retrievedSection.description,
    section.description,
  );
}
