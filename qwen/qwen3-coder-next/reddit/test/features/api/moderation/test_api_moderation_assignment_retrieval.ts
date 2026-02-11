import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_moderation_assignment_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account to establish authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberProfile);
  // Create a new connection with the authorization token
  const authMemberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberProfile.token.access}`,
    },
  };
  // 2. Create a community for testing
  // Since we don't have the admin communities endpoint, we'll use a mock moderation ID
  // In a real scenario, this would be created through the moderation creation workflow
  const mockModeration = typia.random<IRedditPlatformModeration>();
  // 3. Fetch the moderation assignment using the member's authenticated connection
  const fetchedModeration =
    await api.functional.redditPlatform.member.redditPlatform.moderations.at(
      authMemberConnection,
      {
        moderationId: mockModeration.id,
      },
    );
  typia.assert(fetchedModeration);
  // 4. Verify the response contains all expected fields
  TestValidator.equals(
    "moderation ID matches",
    fetchedModeration.id,
    mockModeration.id,
  );
  TestValidator.equals(
    "community ID matches",
    fetchedModeration.community_id,
    mockModeration.community_id,
  );
  TestValidator.equals(
    "user ID matches",
    fetchedModeration.user_id,
    mockModeration.user_id,
  );
  TestValidator.equals(
    "role matches",
    fetchedModeration.role,
    mockModeration.role,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof fetchedModeration.created_at === "string",
  );
  // Verify nested community object
  if (!fetchedModeration.community)
    throw new Error("community object is missing");
  TestValidator.equals(
    "community name exists",
    typeof fetchedModeration.community.name,
    "string",
  );
  TestValidator.equals(
    "community description exists",
    typeof fetchedModeration.community.description,
    "string",
  );
  // Verify nested user object
  if (!fetchedModeration.user) throw new Error("user object is missing");
  TestValidator.equals(
    "user ID exists",
    typeof fetchedModeration.user.id,
    "string",
  );
  TestValidator.equals(
    "user username exists",
    typeof fetchedModeration.user.username,
    "string",
  );
}
