import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test section creation by administrator workflow.
 * 1. Register new administrator account
 * 2. Create section with unique name and description
 * 3. Validate all response fields including UUID, timestamps, and articles_count initialization
 */
export async function test_api_section_creation_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // 2. Create section using utility function with admin connection
  const sectionInput: IDiscussionBoardSection.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardSection.ICreate;
  const section: IDiscussionBoardSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      { body: sectionInput },
    );
  typia.assert(section);
  // 3. Validate business logic (type validation already done by typia.assert)
  TestValidator.equals(
    "section name matches input",
    section.name,
    sectionInput.name,
  );
  TestValidator.equals(
    "section description matches input",
    section.description,
    sectionInput.description,
  );
  TestValidator.equals(
    "deleted_at is null for active section",
    section.deleted_at,
    null,
  );
  TestValidator.equals(
    "articles_count initialized to 0",
    section.articles_count,
    0,
  );
}
