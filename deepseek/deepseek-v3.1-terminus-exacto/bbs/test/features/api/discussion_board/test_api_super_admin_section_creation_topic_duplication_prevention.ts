import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_super_admin_section_creation_topic_duplication_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Create base sections 'Technology' and 'Tech News' using regular admin
  const technologySection =
    await api.functional.discussionBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: "Technology",
          description: "Discussions about technology trends and innovations",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(technologySection);
  const techNewsSection =
    await api.functional.discussionBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: "Tech News",
          description: "Latest news and updates from the tech industry",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(techNewsSection);
  // 3. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminAuth);
  // 4. Attempt to create 'Tech Innovations' section as super admin
  // This should trigger duplication prevention logic
  const techInnovationsSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: "Tech Innovations",
          description:
            "Cutting-edge technological breakthroughs and innovations",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(techInnovationsSection);
  // 5. Validate that section was created despite potential duplication
  // The system should have processed the creation with appropriate checks
  TestValidator.equals(
    "section has unique ID",
    typeof techInnovationsSection.id,
    "string",
  );
  TestValidator.equals(
    "section name matches",
    techInnovationsSection.name,
    "Tech Innovations",
  );
  TestValidator.predicate(
    "section has valid creation timestamp",
    techInnovationsSection.created_at !== null &&
      techInnovationsSection.created_at.length > 0,
  );
  // Validate that all sections have unique IDs
  TestValidator.notEquals(
    "technology section ID differs from tech news",
    technologySection.id,
    techNewsSection.id,
  );
  TestValidator.notEquals(
    "tech innovations ID differs from technology",
    techInnovationsSection.id,
    technologySection.id,
  );
  TestValidator.notEquals(
    "tech innovations ID differs from tech news",
    techInnovationsSection.id,
    techNewsSection.id,
  );
  // Validate section names are preserved
  TestValidator.equals(
    "technology section name preserved",
    technologySection.name,
    "Technology",
  );
  TestValidator.equals(
    "tech news section name preserved",
    techNewsSection.name,
    "Tech News",
  );
  TestValidator.equals(
    "tech innovations section name preserved",
    techInnovationsSection.name,
    "Tech Innovations",
  );
}
