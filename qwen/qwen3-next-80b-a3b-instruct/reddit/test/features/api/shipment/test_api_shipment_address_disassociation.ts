import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_address_disassociation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to establish ownership for the disassociation test
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Generate valid UUIDs for shipmentId and addressId (required by the disassociation endpoint)
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const addressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Test successful disassociation by authenticated member
  // This should succeed as the member has the necessary permissions
  await api.functional.communityPlatform.member.shipments.addresses.erase(
    memberConnection,
    {
      shipmentId,
      addressId,
    },
  );
  // Note: The endpoint returns void and status 204. No response to assert, just successful call.
  // Step 4: Test unauthorized disassociation attempt using base connection
  // This should fail with 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated user cannot disassociate address",
    401,
    async () => {
      await api.functional.communityPlatform.member.shipments.addresses.erase(
        connection, // Using base connection without authentication
        {
          shipmentId, // Using same UUIDs
          addressId,
        },
      );
    },
  );
}
