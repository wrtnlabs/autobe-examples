import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_super_admin_system_notifications_create } from "../../../generate/generate_random_discussion_board_super_admin_system_notifications_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_system_notification } from "../../../prepare/prepare_random_discussion_board_system_notification";

export async function test_api_system_notification_update_with_entity_reference(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create an article for entity reference - using a valid approach
  // Since we cannot create sections without admin privileges, we'll use a different approach
  // Create a simple article with minimal requirements
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create initial notification without entity references
  const initialNotification =
    await generate_random_discussion_board_super_admin_system_notifications_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          notification_type: "announcement",
          status: "pending",
          priority: "normal",
          target_entity_type: null,
          target_entity_id: null,
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(initialNotification);
  // Verify initial notification has no entity references
  TestValidator.equals(
    "initial notification target_entity_type should be null",
    initialNotification.target_entity_type,
    null,
  );
  TestValidator.equals(
    "initial notification target_entity_id should be null",
    initialNotification.target_entity_id,
    null,
  );
  // Update notification to add entity references
  const updatedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.update(
      superAdminConnection,
      {
        notificationId: initialNotification.id,
        body: {
          target_entity_type: "article",
          target_entity_id: article.id,
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(updatedNotification);
  // Verify update succeeded with proper entity references
  TestValidator.equals(
    "updated notification target_entity_type should be 'article'",
    updatedNotification.target_entity_type,
    "article",
  );
  TestValidator.equals(
    "updated notification target_entity_id should match article ID",
    updatedNotification.target_entity_id,
    article.id,
  );
  // Test clearing entity references by updating with null values
  const clearedNotification =
    await api.functional.discussionBoard.superAdmin.system_notifications.update(
      superAdminConnection,
      {
        notificationId: initialNotification.id,
        body: {
          target_entity_type: null,
          target_entity_id: null,
        } satisfies IDiscussionBoardSystemNotification.IUpdate,
      },
    );
  typia.assert(clearedNotification);
  // Verify entity references were cleared
  TestValidator.equals(
    "cleared notification target_entity_type should be null",
    clearedNotification.target_entity_type,
    null,
  );
  TestValidator.equals(
    "cleared notification target_entity_id should be null",
    clearedNotification.target_entity_id,
    null,
  );
}
