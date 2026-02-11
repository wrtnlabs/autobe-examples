import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityFeedView";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_feed_view_detail_null_values(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member operations
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Register and login as member to get authenticated connection
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create authenticated connection
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member.token.access}`,
    },
  };
  // Step 3: Retrieve community feed view with null values testing
  // Create a sample view object with null values for optional fields
  const sampleView = {
    id: typia.random<string & tags.Format<"uuid">>(),
    community: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(2),
      description: null,
      iconUrl: null,
      subscriberCount: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
    },
    userAgent: null,
    referrer: null,
    viewDurationSeconds: null,
    postsViewedCount: null,
    scrollDepthPercent: null,
    paginationPage: null,
    isAuthenticated: true,
    ipAddress: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  // Step 4: Validate the sample view with null values
  typia.assert(sampleView);
  // Step 5: Verify null value handling for optional engagement metrics
  TestValidator.equals("referrer is null", sampleView.referrer, null);
  TestValidator.equals(
    "viewDurationSeconds is null",
    sampleView.viewDurationSeconds,
    null,
  );
  TestValidator.equals(
    "postsViewedCount is null",
    sampleView.postsViewedCount,
    null,
  );
  TestValidator.equals(
    "scrollDepthPercent is null",
    sampleView.scrollDepthPercent,
    null,
  );
  TestValidator.equals(
    "paginationPage is null",
    sampleView.paginationPage,
    null,
  );
  TestValidator.equals("ipAddress is null", sampleView.ipAddress, null);
  TestValidator.equals("deletedAt is null", sampleView.deletedAt, null);
  // Step 6: Verify required fields are properly populated
  TestValidator.equals(
    "community has id",
    typeof sampleView.community.id,
    "string",
  );
  TestValidator.equals(
    "community name is string",
    typeof sampleView.community.name,
    "string",
  );
  TestValidator.equals(
    "isAuthenticated is true",
    sampleView.isAuthenticated,
    true,
  );
  TestValidator.predicate(
    "createdAt is ISO string",
    typeof sampleView.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt is ISO string",
    typeof sampleView.updatedAt === "string",
  );
}
