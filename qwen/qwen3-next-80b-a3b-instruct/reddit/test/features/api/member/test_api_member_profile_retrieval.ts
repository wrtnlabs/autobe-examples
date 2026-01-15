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
export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new member using authorize_member_join utility function
  // This modifies memberConnection in-place (updates headers with token)
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Retrieve the member's profile using the authenticated connection
  // memberConnection already has updated headers from authorize_member_join
  const profile: ICommunityPlatformMember.IAuthorized =
    await api.functional.my.profile.at(memberConnection);
  // Step 4: Validate the entire profile structure using typia.assert
  // This validates ALL properties and nested structures according to ICommunityPlatformMember.IAuthorized
  typia.assert(profile);
}
