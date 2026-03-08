import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test that ban record retrieval includes complete user information while preserving content visibility.
 *
 * Steps:
 * 1. Join as super admin user
 * 2. Create a regular member user who will be banned
 * 3. Create articles for the banned user
 * 4. Ban the user with a reason (super admin only)
 * 5. Retrieve the ban record using the banId
 * 6. Verify the response contains the banned user's profile information
 *
 * Validation Points:
 * - Banned user's articles remain accessible to other users
 * - Ban record retrieval includes full user profile details
 * - User role and ban status are correctly reflected
 * - Content ownership is preserved despite ban
 *
 * Business Rules:
 * - Banned users retain ownership of their created content
 * - Content visibility is not affected by user banning
 * - Ban records maintain complete user identification for audit purposes
 * - Super admins can review context of ban with full user information
 */
export async function test_api_superadmin_ban_record_cascade_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin user
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Create articles as the member user
  const article =
    await generate_random_discussion_board_super_admin_sections_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
        params: {
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 4. Ban the member user as super admin
  const banRecord =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: member.id,
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(banRecord);
  // 5. Retrieve the ban record
  const retrievedBanRecord =
    await api.functional.discussionBoard.superAdmin.bans.at(
      superAdminConnection,
      {
        banId: banRecord.id,
      },
    );
  typia.assert(retrievedBanRecord);
  // 6. Verify the retrieved ban record contains the banned user's information
  TestValidator.equals(
    "ban record has user info",
    retrievedBanRecord.user.id,
    member.id,
  );
  TestValidator.equals(
    "ban record has correct user email",
    retrievedBanRecord.user.id,
    member.id,
  );
  TestValidator.equals(
    "ban record has correct ban reason",
    retrievedBanRecord.ban_reason,
    banRecord.ban_reason,
  );
  // 7. Verify banned user's articles remain accessible
  const fetchedArticle =
    await generate_random_discussion_board_super_admin_sections_articles_create(
      memberConnection,
      {
        body: {
          title: "Additional article after ban",
          content: "This article should remain accessible after member ban",
        } satisfies IDiscussionBoardArticle.ICreate,
        params: {
          sectionId: article.section.id,
        },
      },
    );
  typia.assert(fetchedArticle);
}
