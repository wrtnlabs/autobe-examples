import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformShipmentReturnAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentReturnAuthorization";
import type { IEReturnAuthorizationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReturnAuthorizationStatus";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformShipmentReturnAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformShipmentReturnAuthorization";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_return_authorization_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create test shipment ID
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve return authorizations for the shipment using authenticated member
  const response =
    await api.functional.communityPlatform.member.shipments.return_authorizations.index(
      memberConnection,
      {
        shipmentId,
      },
    );
  typia.assert(response);
  // Step 4: Validate the structure of the response (since typia.assert guarantees correctness)
  TestValidator.equals(
    "pagination is defined",
    response.pagination !== null,
    true,
  );
  TestValidator.equals("data is defined", response.data !== undefined, true);
  TestValidator.equals("data is an array", Array.isArray(response.data), true);
  // Step 5: Test unauthorized access attempt
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.communityPlatform.member.shipments.return_authorizations.index(
      unauthenticatedConnection,
      {
        shipmentId,
      },
    );
  });
  // Step 6: Validate that no invalid data types are present in response (redundant after typia.assert)
  // We trust typia.assert() for full type validation
  // No additional validation needed
}
