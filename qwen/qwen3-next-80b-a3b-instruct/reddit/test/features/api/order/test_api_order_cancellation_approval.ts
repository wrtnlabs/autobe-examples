import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderCancellation";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_order_cancellation_approval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
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
  // Step 2: Create an order (required prerequisite for cancellation)
  // Since we need an order ID for cancellation, we'll create a valid UUID
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const cancellationId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create order cancellation with status 'initiated'
  const cancellation =
    await api.functional.communityPlatform.member.orders.cancellations.update(
      memberConnection,
      {
        orderId,
        cancellationId,
        body: {
          status: "initiated",
        } satisfies ICommunityPlatformOrderCancellation.IUpdate,
      },
    );
  typia.assert(cancellation);
  // Step 4: Update cancellation status from 'initiated' to 'approved'
  const approvedCancellation =
    await api.functional.communityPlatform.member.orders.cancellations.update(
      memberConnection,
      {
        orderId,
        cancellationId,
        body: {
          status: "approved",
        } satisfies ICommunityPlatformOrderCancellation.IUpdate,
      },
    );
  typia.assert(approvedCancellation);
  // Step 5: Validate response structure and status transition
  // For ICommunityPlatformOrderCancellation, only the status provided in the update is guaranteed
  TestValidator.equals(
    "cancellation status should be approved",
    approvedCancellation.status,
    "approved",
  );
}
