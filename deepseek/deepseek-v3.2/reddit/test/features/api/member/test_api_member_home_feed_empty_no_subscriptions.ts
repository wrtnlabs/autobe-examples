import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test empty home feed scenario when member has no subscriptions.
 * After authenticating as a new member without any community subscriptions,
 * access the home feed. Verify the response contains an empty data array
 * with proper pagination metadata showing zero records. Confirm the system
 * correctly handles the edge case of no subscribed communities and returns
 * valid pagination information without errors.
 */
export async function test_api_member_home_feed_empty_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register and authenticate new member using utility function
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // Prepare home feed request with proper tagged types
  const requestBody = {
    sort: "hot" as const,
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies ICommunityPlatformPost.IRequest;
  // Ensure page is 1 and limit is reasonable for testing
  const page = requestBody.page satisfies number as number;
  const limit = requestBody.limit satisfies number as number;
  // Call home feed endpoint
  const response =
    await api.functional.communityPlatform.member.home_feed.index(
      memberConnection,
      {
        body: {
          ...requestBody,
          page,
          limit,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(response);
  // Validate empty data array
  TestValidator.equals(
    "home feed data should be empty for member with no subscriptions",
    response.data,
    [],
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    response.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
}
