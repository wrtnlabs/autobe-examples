import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import type { IDiscussionBoardSystemNotificationOfAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfAdmin";
import type { IDiscussionBoardSystemNotificationOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfMember";
import type { IDiscussionBoardSystemNotificationOfSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_system_notifications_create } from "../../../generate/generate_random_discussion_board_admin_system_notifications_create";
import { prepare_random_discussion_board_system_notification } from "../../../prepare/prepare_random_discussion_board_system_notification";

export async function test_api_admin_system_notification_subtype_retrieval_member_target(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Create a system notification
  const notification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          notification_type: "announcement",
          status: "pending",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(notification);
  // Create member-specific notification subtype
  const subtype =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.createSubtype(
      adminConnection,
      {
        notificationId: notification.id,
        body: {
          actor_type: "member",
          member_id: member.id,
        } satisfies IDiscussionBoardSystemNotification.ICreateSubtype,
      },
    );
  typia.assert(subtype);
  // The subtype response contains a polymorphic subtype field
  // We need to extract the member-specific subtype ID
  const memberSubtypeId = subtype.subtype.id;
  // Retrieve the member-specific notification subtype
  const retrievedSubtype =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.at(
      adminConnection,
      {
        notificationId: notification.id,
        subtypeId: memberSubtypeId,
      },
    );
  typia.assert(retrievedSubtype);
  
  // Cast to the correct member-specific type using safe double-cast
  const memberSubtype = retrievedSubtype as unknown as IDiscussionBoardSystemNotificationOfMember;
  
  // Validate that we received member-specific subtype data
  TestValidator.predicate(
    "response should contain member subtype fields",
    "is_read" in memberSubtype &&
      "read_at" in memberSubtype &&
      "acknowledged_at" in memberSubtype &&
      "notification_preferences" in memberSubtype,
  );
  // Verify parent notification reference
  TestValidator.equals(
    "parent notification ID should match",
    memberSubtype.systemNotification.id,
    notification.id,
  );
  // Verify member reference
  TestValidator.equals(
    "member ID should match",
    memberSubtype.member.id,
    member.id,
  );
  // Validate member-specific field types
  TestValidator.predicate(
    "is_read should be boolean",
    typeof memberSubtype.is_read === "boolean",
  );
  TestValidator.predicate(
    "read_at should be date-time or null",
    memberSubtype.read_at === null ||
      typeof memberSubtype.read_at === "string",
  );
  TestValidator.predicate(
    "acknowledged_at should be date-time or null",
    memberSubtype.acknowledged_at === null ||
      typeof memberSubtype.acknowledged_at === "string",
  );
  TestValidator.predicate(
    "notification_preferences should be string or null",
    memberSubtype.notification_preferences === null ||
      typeof memberSubtype.notification_preferences === "string",
  );
}