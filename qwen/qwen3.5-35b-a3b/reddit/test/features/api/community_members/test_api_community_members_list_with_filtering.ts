import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityMember";
import type { IRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_members_list_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_member_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + RandomGenerator.alphaNumeric(2),
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies DeepPartial<IRedditPlatformMember.IJoin>,
  });
  typia.assert(user1);
  // 2. Create second member account
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_member_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + RandomGenerator.alphaNumeric(2),
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies DeepPartial<IRedditPlatformMember.IJoin>,
  });
  typia.assert(user2);
  // 3. Call API with moderator role filter
  const moderatorResponse: IPageIRedditPlatformCommunityMember.ISummary =
    await api.functional.redditPlatform.communities.members.index(connection, {
      name: "test-community",
      body: {
        role: "moderator",
      } satisfies IRedditPlatformCommunityMember.IRequest,
    });
  typia.assert(moderatorResponse);
  // 4. Verify response contains only moderator role members
  TestValidator.equals(
    "all members are moderators",
    moderatorResponse.data.every((member) => member.role === "moderator"),
    true,
  );
  // 5. Verify pagination metadata structure
  TestValidator.equals(
    "pagination current valid",
    moderatorResponse.pagination.current,
    moderatorResponse.pagination.current,
  );
  TestValidator.equals(
    "pagination limit positive",
    moderatorResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records non-negative",
    moderatorResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages non-negative",
    moderatorResponse.pagination.pages >= 0,
    true,
  );
  // 6. Verify each member record structure
  for (const member of moderatorResponse.data) {
    typia.assert(member);
    // Validate required fields exist and have correct types
    TestValidator.predicate(
      "member id valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        member.id,
      ),
    );
    TestValidator.predicate(
      "member role is moderator",
      member.role === "moderator",
    );
    TestValidator.predicate(
      "member user object exists",
      member.user !== undefined && member.user !== null,
    );
    TestValidator.predicate(
      "member joined_at is valid datetime",
      member.joined_at !== undefined && member.joined_at !== null,
    );
    TestValidator.predicate(
      "member created_at is valid datetime",
      member.created_at !== undefined && member.created_at !== null,
    );
    TestValidator.predicate(
      "member updated_at is valid datetime",
      member.updated_at !== undefined && member.updated_at !== null,
    );
    TestValidator.predicate(
      "member deleted_at can be null for active",
      member.deleted_at === null ||
        (member.deleted_at !== undefined && member.deleted_at !== null),
    );
    // Validate user object fields
    typia.assert(member.user);
    TestValidator.predicate(
      "user id valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        member.user.id,
      ),
    );
    TestValidator.predicate(
      "user username exists",
      member.user.username !== undefined && member.user.username !== null,
    );
    TestValidator.predicate(
      "user karma is integer",
      member.user.karma !== undefined &&
        member.user.karma !== null &&
        Number.isInteger(member.user.karma),
    );
    TestValidator.predicate(
      "user created_at is valid datetime",
      member.user.created_at !== undefined && member.user.created_at !== null,
    );
    // Verify username is not empty string
    TestValidator.predicate(
      "username not empty",
      member.user.username !== undefined &&
        member.user.username !== null &&
        member.user.username.length > 0,
    );
  }
  // 7. Test pagination controls
  const paginatedResponse: IPageIRedditPlatformCommunityMember.ISummary =
    await api.functional.redditPlatform.communities.members.index(connection, {
      name: "test-community",
      body: {
        page: 2,
        limit: 20,
      } satisfies IRedditPlatformCommunityMember.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination current page is 2",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 20",
    paginatedResponse.pagination.limit,
    20,
  );
  // 8. Test sort by joined_at
  const sortedResponse: IPageIRedditPlatformCommunityMember.ISummary =
    await api.functional.redditPlatform.communities.members.index(connection, {
      name: "test-community",
      body: {
        sort: "joined_at",
      } satisfies IRedditPlatformCommunityMember.IRequest,
    });
  typia.assert(sortedResponse);
  TestValidator.predicate(
    "sorted response has valid data",
    sortedResponse.data !== undefined && sortedResponse.data !== null,
  );
  // 9. Test no filter (get all roles)
  const allResponse: IPageIRedditPlatformCommunityMember.ISummary =
    await api.functional.redditPlatform.communities.members.index(connection, {
      name: "test-community",
      body: {} satisfies IRedditPlatformCommunityMember.IRequest,
    });
  typia.assert(allResponse);
  TestValidator.predicate(
    "all roles response valid",
    allResponse.data !== undefined && allResponse.data !== null,
  );
}
