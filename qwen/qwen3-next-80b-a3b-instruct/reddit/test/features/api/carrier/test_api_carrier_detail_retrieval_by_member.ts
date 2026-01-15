import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCarrier";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_carrier_detail_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as member using the authorization utility function
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/join?source=${RandomGenerator.alphaNumeric(6)}`,
      referrer: `https://example.com/home?ref=${RandomGenerator.alphaNumeric(6)}`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // memberConnection.headers is now updated with token from authResult
  // Step 2: Generate a valid UUID for carrierId
  // According to the API spec, carrierId is a UUID format string
  const carrierId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Retrieve the carrier details using the valid UUID
  const retrievedCarrier = await api.functional.communityPlatform.carriers.at(
    memberConnection,
    {
      carrierId,
    },
  );
  // Step 4: Validate that the response structure matches ICommunityPlatformCarrier exactly
  typia.assert<ICommunityPlatformCarrier>(retrievedCarrier);
}
