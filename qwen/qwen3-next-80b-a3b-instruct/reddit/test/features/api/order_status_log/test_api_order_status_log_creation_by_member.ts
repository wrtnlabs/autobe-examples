import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderStatusLog";
import { prepare_random_community_platform_order_status_log } from "../../../prepare/prepare_random_community_platform_order_status_log";
import { generate_random_community_platform_member_orders_status_logs_create } from "../../../generate/generate_random_community_platform_member_orders_status_logs_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_order_status_log_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create a status log entry for a randomly generated order ID
  // We use a random UUID as the order ID because we cannot create orders without a dedicated endpoint
  // The backend will handle order existence and ownership validation
  const statusLog =
    await api.functional.communityPlatform.member.orders.status_logs.create(
      memberConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "confirmed",
        } satisfies ICommunityPlatformOrderStatusLog.ICreate,
      },
    );
  typia.assert(statusLog);
  // Step 3: Validate that the status log correctly attributes the action to the authenticated member
  TestValidator.equals(
    "status log status should be confirmed",
    statusLog.status,
    "confirmed",
  );
  TestValidator.equals(
    "status log created_by_type should be user",
    statusLog.created_by_type,
    "user",
  );
  TestValidator.equals(
    "status log created_by_id should match member id",
    statusLog.created_by_id,
    member.id,
  );
  TestValidator.predicate(
    "status log should have a valid created_at timestamp",
    () => {
      return (
        statusLog.created_at !== undefined &&
        new Date(statusLog.created_at).toISOString() === statusLog.created_at
      );
    },
  );
}
