import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationReadStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationReadStatus";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_notification_read_status_update(connection: api.IConnection): Promise<void> {
    // Create a new connection for member authentication
    const memberConnection: api.IConnection = { host: connection.host };
    
    // Step 1: Authenticate as member using the utility function
    const memberCredentials = {
        email: typia.random<string & tags.Format<'email'>>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://example.com/join?source=${RandomGenerator.alphaNumeric(6)}`,
        referrer: `https://example.com/home?ref=${RandomGenerator.alphaNumeric(6)}`
    } satisfies ICommunityPlatformMember.IJoin;
    const member: ICommunityPlatformMember.IAuthorized = await authorize_member_join(memberConnection, { body: memberCredentials });
    
    // Step 2: Update notification read status to 'read'
    // Generate a random statusId (since we have no way to create a notification event)
    const statusId = typia.random<string & tags.Format<'uuid'>>();
    
    // Create or update notification read status to 'read'
    const notificationStatusUpdate: ICommunityPlatformNotificationReadStatus.IUpdate = {
        status: "read"
    };
    const updatedStatus: ICommunityPlatformNotificationReadStatus = await api.functional.communityPlatform.member.notification_read_status.putByStatusid(memberConnection, {
        statusId,
        body: notificationStatusUpdate
    });
    
    // Validate response matches ICommunityPlatformNotificationReadStatus
    typia.assert(updatedStatus);
    
    // Validate required properties exist and have correct types using typia.is for format validation
    TestValidator.predicate("id is a valid UUID", typia.is<string & tags.Format<'uuid'>>(updatedStatus.id));
    TestValidator.predicate("notification_event_id is a valid UUID", typia.is<string & tags.Format<'uuid'>>(updatedStatus.notification_event_id));
    TestValidator.predicate("member_id is a valid UUID", typia.is<string & tags.Format<'uuid'>>(updatedStatus.member_id));
    TestValidator.equals("member_id matches authenticated member", updatedStatus.member_id, member.id);
    
    // Validate status can be updated to 'unread'
    const unreadStatusUpdate: ICommunityPlatformNotificationReadStatus.IUpdate = {
        status: "unread"
    };
    const unreadStatus: ICommunityPlatformNotificationReadStatus = await api.functional.communityPlatform.member.notification_read_status.putByStatusid(memberConnection, {
        statusId,
        body: unreadStatusUpdate
    });
    typia.assert(unreadStatus);
    
    // Validate status can be updated to 'archived'
    const archivedStatusUpdate: ICommunityPlatformNotificationReadStatus.IUpdate = {
        status: "archived"
    };
    const archivedStatus: ICommunityPlatformNotificationReadStatus = await api.functional.communityPlatform.member.notification_read_status.putByStatusid(memberConnection, {
        statusId,
        body: archivedStatusUpdate
    });
    typia.assert(archivedStatus);
    
    // Validate status can be updated to 'deleted'
    const deletedStatusUpdate: ICommunityPlatformNotificationReadStatus.IUpdate = {
        status: "deleted"
    };
    const deletedStatus: ICommunityPlatformNotificationReadStatus = await api.functional.communityPlatform.member.notification_read_status.putByStatusid(memberConnection, {
        statusId,
        body: deletedStatusUpdate
    });
    typia.assert(deletedStatus);
}