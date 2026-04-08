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

export async function test_api_community_moderator_access_to_all_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user1 (owner) account
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Auth = await authorize_member_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(2),
      href: "https://test.example.com/signup",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(user1Auth);
  const user1Username = user1Auth.username;
  const communityName = user1Username.toLowerCase().replace(/_/g, "");
  // 2. Create user2 (moderator) account
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Auth = await authorize_member_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(2),
      href: "https://test.example.com/signup",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(user2Auth);
  const user2Username = user2Auth.username;
  // 3. Create user3 (regular member) account
  const user3Connection: api.IConnection = { host: connection.host };
  const user3Auth = await authorize_member_join(user3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(2),
      href: "https://test.example.com/signup",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(user3Auth);
  // 4. Login as user2 (moderator)
  const user2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(user2LoginConnection, {
    body: {
      email: user2Auth.email,
      password: user2Auth.token.refresh,
    } satisfies IRedditPlatformMember.ILogin,
  });
  // 5. Call members index endpoint without role filter
  const membersResponse =
    await api.functional.redditPlatform.communities.members.index(
      user2LoginConnection,
      {
        name: communityName,
        body: {},
      },
    );
  typia.assert(membersResponse);
  // 6. Validate response structure
  TestValidator.equals("pagination present", membersResponse.pagination, {
    current: 1,
    limit: 10,
    records: 0,
    pages: 1,
  });
  TestValidator.equals(
    "data is array",
    Array.isArray(membersResponse.data),
    true,
  );
  // 7. Extract unique roles
  const roles = new Set(membersResponse.data.map((m) => m.role));
  // 8. Verify at least one member with each role exists
  const hasOwner = roles.has("owner");
  const hasModerator = roles.has("moderator");
  const hasMember = roles.has("member");
  TestValidator.equals("response contains owner role", hasOwner, true);
  TestValidator.equals("response contains moderator role", hasModerator, true);
  TestValidator.equals("response contains member role", hasMember, true);
  // 9. Verify user2 can see themselves as moderator
  const user2AsModerator = membersResponse.data.find(
    (m) => m.user.id === user2Auth.id && m.role === "moderator",
  );
  TestValidator.equals(
    "user2 appears as moderator in list",
    user2AsModerator,
    undefined,
    (key) => key !== "user",
  );
  // 10. Verify total member count is reasonable
  TestValidator.equals(
    "at least 3 members in response",
    membersResponse.data.length,
    3,
  );
}