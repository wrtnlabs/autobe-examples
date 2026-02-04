import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_unsubscription(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate member (join)
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Validate authentication succeeded, token is set
  TestValidator.equals(
    "member token assigned",
    typeof memberAuth.access_token,
    "string",
  );
  // Step 2: Create a community using member connection
  const createdCommunity: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // Validate community creation succeeded
  TestValidator.equals(
    "community_code is defined",
    typeof createdCommunity.community_code,
    "string",
  );
  // Step 3: Subscribe member to the community
  await api.functional.communityPlatform.member.communities.subscribers.create(
    memberConnection,
    {
      communityCode: createdCommunity.community_code,
    },
  );
  // Step 4: Unsubscribe member from the community
  await api.functional.communityPlatform.member.communities.subscribers.erase(
    memberConnection,
    {
      communityCode: createdCommunity.community_code,
    },
  );
  // Step 5: Verify unsubscribe returned 204 No Content
  await TestValidator.httpError(
    "unsubscribe should return 204 No Content",
    204,
    async () => {
      // We use a special validation: if this call throws with status 204, it validates the operation
      // No body is returned, so we just need to confirm no error occurs and status is 204
      await api.functional.communityPlatform.member.communities.subscribers.erase(
        memberConnection,
        {
          communityCode: createdCommunity.community_code,
        },
      );
    },
  );
  // Step 6: Verify idempotent behavior - unsubscribe a second time
  // This should also return 204
  await TestValidator.httpError(
    "idempotent unsubscribe should return 204 No Content",
    204,
    async () => {
      await api.functional.communityPlatform.member.communities.subscribers.erase(
        memberConnection,
        {
          communityCode: createdCommunity.community_code,
        },
      );
    },
  );
}
