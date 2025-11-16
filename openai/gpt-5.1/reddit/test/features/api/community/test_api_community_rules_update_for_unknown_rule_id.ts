import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_community_rules_update_for_unknown_rule_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    // ip is optional; let the backend derive it when omitted
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community under this memberUser context
  const communityCreateBody =
    typia.random<ICommunityPlatformCommunity.ICreate>();

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Prepare an obviously non-existent ruleId (random UUID) and a valid update payload
  const unknownRuleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  // 4. Call the update endpoint expecting it to fail for non-existent rules
  await TestValidator.error(
    "updating non-existent community rules must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.rules.update(
        connection,
        {
          communitySlug: community.slug,
          ruleId: unknownRuleId,
          body: updateBody,
        },
      );
    },
  );
}
