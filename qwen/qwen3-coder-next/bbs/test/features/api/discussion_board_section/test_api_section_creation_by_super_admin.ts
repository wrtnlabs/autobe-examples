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

export async function test_api_section_creation_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "SecurePass123!",
      display_name: "Super Admin",
      bio: "System administrator with super privileges",
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResponse);
  // Step 2: Create a new section with valid data
  const sectionName = "General Discussion";
  const sectionDescription = "A place for general topic discussions";
  const newSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: sectionName,
          description: sectionDescription,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(newSection);
  // Step 3: Verify duplicate name creates conflict
  await TestValidator.error(
    "duplicate section name throws conflict",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.create(
        superAdminConnection,
        {
          body: {
            name: sectionName,
            description: "Duplicate section",
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
}
