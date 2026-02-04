import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_subscription_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // memberConnection.headers is now updated internally by authorize function
  // Step 2: Test subscription to a non-existent community
  // Use a unique non-existent community code that won't conflict with any real community
  const nonExistentCommunityCode =
    "non-existent-community-" + RandomGenerator.alphaNumeric(16);
  // Step 3: Attempt to subscribe to the non-existent community
  // This should fail with a 404 error because the community doesn't exist
  await TestValidator.error(
    "subscription to non-existent community should fail with 404",
    async () => {
      await api.functional.communityPlatform.member.communities.subscribers.create(
        memberConnection,
        {
          communityCode: nonExistentCommunityCode,
        },
      );
    },
  );
}
