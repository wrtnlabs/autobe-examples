import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_administrator_promotion_regular_to_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create and authenticate regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 3. Verify regular admin can create articles (regular permissions work)
  const regularAdminArticle =
    await generate_random_discussion_board_admin_articles_create(
      regularAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }) satisfies string &
            tags.MinLength<5> &
            tags.MaxLength<200>,
          content: RandomGenerator.paragraph({
            sentences: 3,
          }) satisfies string & tags.MinLength<50>,
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(regularAdminArticle);
  // 4. Promote regular admin to super admin
  const promotionUpdate = {
    permission_level: "super_admin",
  } satisfies IDiscussionBoardSuperAdmin.IUpdate;
  const promotedAdmin =
    await api.functional.discussionBoard.superAdmin.administrators.update(
      superAdminConnection,
      {
        administratorId: regularAdminArticle.author.id satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
        body: promotionUpdate,
      },
    );
  typia.assert(promotedAdmin);
  // 5. Verify promotion succeeded - promoted admin now has super admin permissions
  const superAdminArticle =
    await generate_random_discussion_board_super_admin_articles_create(
      regularAdminConnection, // Now using the previously regular admin connection
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }) satisfies string &
            tags.MinLength<5> &
            tags.MaxLength<200>,
          content: RandomGenerator.paragraph({
            sentences: 3,
          }) satisfies string & tags.MinLength<50>,
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(superAdminArticle);
  // Validate the promotion operation
  TestValidator.equals(
    "promoted admin should have updated permission level",
    promotedAdmin.permission_level,
    "super_admin",
  );
  TestValidator.predicate(
    "promoted admin should have valid assignment date",
    promotedAdmin.assignment_date !== null,
  );
  TestValidator.notEquals(
    "promoted admin record should differ from before",
    promotedAdmin.id,
    regularAdminArticle.author.id,
  );
}
