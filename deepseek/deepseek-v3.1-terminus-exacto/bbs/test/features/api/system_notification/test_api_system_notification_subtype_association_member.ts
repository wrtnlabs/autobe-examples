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

export async function test_api_system_notification_subtype_association_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create member connection and register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  // 3. Create parent system notification using admin connection
  const parentNotification =
    await generate_random_discussion_board_admin_system_notifications_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          notification_type: "alert",
          status: "pending",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.ICreate,
      },
    );
  typia.assert(parentNotification);
  // 4. Create member subtype association with member_id from step 2
  const subtypeBody = {
    actor_type: "member" as const,
    member_id: memberAuth.id,
  } satisfies IDiscussionBoardSystemNotification.ICreateSubtype;
  const subtypeResponse =
    await api.functional.discussionBoard.admin.system_notifications.subtypes.createSubtype(
      adminConnection,
      {
        notificationId: parentNotification.id,
        body: subtypeBody,
      },
    );
  typia.assert(subtypeResponse);
  // 5. Validate response structure and business logic
  TestValidator.equals(
    "subtype should have correct notification ID",
    subtypeResponse.id,
    parentNotification.id,
  );
  TestValidator.equals(
    "subtype should have correct title",
    subtypeResponse.title,
    parentNotification.title,
  );
  TestValidator.equals(
    "subtype should have correct content",
    subtypeResponse.content,
    parentNotification.content,
  );
  TestValidator.equals(
    "subtype should have correct notification type",
    subtypeResponse.notification_type,
    parentNotification.notification_type,
  );
  TestValidator.equals(
    "subtype should have correct status",
    subtypeResponse.status,
    parentNotification.status,
  );
  TestValidator.equals(
    "subtype should have correct priority",
    subtypeResponse.priority,
    parentNotification.priority,
  );
  // Validate subtype-specific properties
  TestValidator.predicate(
    "subtype should have member subtype",
    "member" in subtypeResponse.subtype && "is_read" in subtypeResponse.subtype,
  );
  const memberSubtype =
    subtypeResponse.subtype as IDiscussionBoardSystemNotificationOfMember;
  TestValidator.equals(
    "member subtype should have correct member ID",
    memberSubtype.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "member subtype should have correct member display name",
    memberSubtype.member.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals(
    "member subtype should have correct member bio",
    memberSubtype.member.bio,
    memberAuth.bio,
  );
  TestValidator.predicate(
    "member subtype should have is_read as false",
    memberSubtype.is_read === false,
  );
  TestValidator.predicate(
    "member subtype should have read_at as null",
    memberSubtype.read_at === null,
  );
  TestValidator.predicate(
    "member subtype should have acknowledged_at as null",
    memberSubtype.acknowledged_at === null,
  );
}
