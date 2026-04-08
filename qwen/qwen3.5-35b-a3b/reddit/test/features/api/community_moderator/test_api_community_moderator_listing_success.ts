import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_moderator_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name() + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Call moderators endpoint with predefined community name
  const communityName = "test-community";
  const moderators =
    await api.functional.redditPlatform.member.communities.moderators.search(
      memberConnection,
      { communityName },
    );
  typia.assert(moderators);
  // 3. Validate response is an array
  const moderatorList = typia.assert<IRedditPlatformCommunityModerator[]>(moderators);
  TestValidator.equals("response is array", Array.isArray(moderatorList), true);
  // 4. Validate each moderator structure
  if (moderatorList.length > 0) {
    for (const moderator of moderatorList) {
      typia.assert(moderator);
    }
    // 5. Validate sorting (newest first by assigned_at)
    if (moderatorList.length > 1) {
      for (let i = 0; i < moderatorList.length - 1; i++) {
        const currentDate = new Date(moderatorList[i].assigned_at);
        const nextDate = new Date(moderatorList[i + 1].assigned_at);
        TestValidator.predicate(
          "moderators sorted correctly (newest first)",
          currentDate >= nextDate,
        );
      }
    }
  }
}