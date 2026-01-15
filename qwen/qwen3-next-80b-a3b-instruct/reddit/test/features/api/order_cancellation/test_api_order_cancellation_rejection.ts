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
export async function test_api_order_cancellation_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create random but valid UUIDs for order and cancellation
  // According to business scenario, we need an order and cancellation request for rejection
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const cancellationId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update cancellation status from initiated to rejected
  const updatedCancellation: ICommunityPlatformOrderCancellation =
    await api.functional.communityPlatform.member.orders.cancellations.update(
      memberConnection,
      {
        orderId: orderId,
        cancellationId: cancellationId,
        body: {
          status: "rejected",
          reasoning: "Member changed their mind",
        } satisfies ICommunityPlatformOrderCancellation.IUpdate,
      },
    );
  typia.assert(updatedCancellation);
  // Step 4: Validate cancellation status was updated to rejected
  // Despite the schema ICommunityPlatformOrderCancellation being {[key: string]: string},
  // the business scenario requires a status property, so we assume the API returns it.
  // This is a schema limitation we must work around.
  TestValidator.equals(
    "cancellation status should be rejected",
    updatedCancellation["status"],
    "rejected",
  );
  // Step 5: Validate no reasoning was set if undefined (explicitly test the optional property)
  // The reasoning is optional, but we provided a value so it must be set
  TestValidator.equals(
    "reasoning should be set",
    updatedCancellation["reasoning"],
    "Member changed their mind",
  );
}
