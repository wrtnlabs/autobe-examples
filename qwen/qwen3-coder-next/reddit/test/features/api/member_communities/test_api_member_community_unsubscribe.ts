import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommon";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_community_unsubscribe(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account and get authentication token
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(2),
  } satisfies IRedditPlatformMember.IJoin;
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(authorizedMember);
  // Create a new authenticated connection with the JWT token
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorizedMember.token.access}`,
    },
  };
  // Step 2: Create a community ID for testing
  // Note: We don't have a direct community creation endpoint in the provided SDK
  // The test focuses on the unsubscription functionality which is the primary requirement
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Test unsubscription with valid authenticated connection
  const result =
    await api.functional.redditPlatform.member.communities.subscriptions.erase(
      authenticatedMemberConnection,
      {
        communityId,
      },
    );
  typia.assert(result);
  // Step 4: Validate the response structure
  TestValidator.predicate(
    "has message property",
    typeof result.message === "string",
  );
}
