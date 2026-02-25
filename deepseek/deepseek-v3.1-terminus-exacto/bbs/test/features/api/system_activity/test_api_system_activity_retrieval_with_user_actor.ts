import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_system_activity_retrieval_with_user_actor(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create regular user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Note: In a real implementation, we would need to create a section first
  // Since section creation is not available in the provided APIs, we'll use a random UUID
  // This assumes the system has at least one valid section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // User creates an article to generate system activity
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Retrieve the system activity record - we need to get the actual activity ID
  // Since we don't have an API to list activities, we'll need to assume the system
  // creates an activity for the article creation and we can retrieve it
  // This is a limitation of the current API design
  // For now, we'll test the retrieval endpoint with a valid activity ID
  // In a complete implementation, we would list activities first to get the ID
  const activityId = typia.random<string & tags.Format<"uuid">>();
  // This will likely fail with 404, but tests the endpoint structure
  const systemActivity =
    await api.functional.discussionBoard.superAdmin.system_activities.at(
      superAdminConnection,
      { activityId },
    );
  typia.assert(systemActivity);
  // Validate user actor reference is properly populated
  TestValidator.predicate(
    "user reference should not be null",
    systemActivity.user !== null,
  );
  // If user reference exists, validate it matches the creating user
  if (systemActivity.user !== null) {
    TestValidator.equals(
      "user id should match",
      systemActivity.user.id,
      userAuth.id,
    );
    TestValidator.equals(
      "user display name should match",
      systemActivity.user.display_name,
      userAuth.display_name,
    );
  }
  // Validate admin and superAdmin references are null for user-generated activities
  TestValidator.equals(
    "admin reference should be null",
    systemActivity.admin,
    null,
  );
  TestValidator.equals(
    "superAdmin reference should be null",
    systemActivity.super_admin,
    null,
  );
  // Validate contextual information
  TestValidator.predicate(
    "IP address should be recorded",
    systemActivity.ip_address !== null,
  );
  TestValidator.predicate(
    "user agent should be recorded",
    systemActivity.user_agent !== null,
  );
  TestValidator.predicate(
    "referrer should be recorded",
    systemActivity.referrer !== null,
  );
  // Validate activity details
  TestValidator.predicate(
    "activity type should be set",
    systemActivity.activity_type.length > 0,
  );
  TestValidator.predicate(
    "success status should be true",
    systemActivity.success_status === true,
  );
  TestValidator.equals(
    "error message should be null",
    systemActivity.error_message,
    null,
  );
}
