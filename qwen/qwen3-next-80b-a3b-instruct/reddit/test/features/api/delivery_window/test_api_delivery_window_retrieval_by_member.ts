import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCarrierPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCarrierPerformance";
import type { ICommunityPlatformDeliveryWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeliveryWindow";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformRegionPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRegionPerformance";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_delivery_window_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate member using authorize_member_join utility function
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const authResult = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(authResult);
  // Step 2: Generate a random delivery window ID using typia.random
  const windowId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the delivery window using the authenticated member connection
  const deliveryWindow: ICommunityPlatformDeliveryWindow =
    await api.functional.communityPlatform.member.delivery_windows.at(
      memberConnection, // Use member-specific connection, NOT base connection
      {
        windowId,
      },
    );
  typia.assert(deliveryWindow);
}
