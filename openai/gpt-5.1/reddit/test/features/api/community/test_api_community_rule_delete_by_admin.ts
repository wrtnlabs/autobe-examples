import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that an adminUser can delete a community rule created under a
 * community.
 *
 * Business flow:
 *
 * 1. Register a memberUser (join), which also authenticates the connection as that
 *    member.
 * 2. As memberUser, create a community and capture its slug and id.
 * 3. As memberUser, create a community rule for that community and capture its id;
 *    also verify the embedded community summary context.
 * 4. Register an adminUser (join), which authenticates the connection as
 *    adminUser.
 * 5. As adminUser, delete the previously created rule using the communitySlug and
 *    ruleId.
 * 6. Assert that:
 *
 *    - All creation responses are structurally valid.
 *    - The rule is associated with the expected community before deletion.
 *    - The delete call completes successfully (no thrown error) when invoked as
 *         admin.
 */
export async function test_api_community_rule_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Member user registration (join) & authentication
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: typia.random<ICommunityPlatformMemberuser.IJoin>(),
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the member user
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: typia.random<ICommunityPlatformCommunity.ICreate>(),
      },
    );
  typia.assert(community);

  // 3. Create a community rule for that community as member user
  const ruleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const rule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: ruleCreateBody,
      },
    );
  typia.assert(rule);

  TestValidator.equals(
    "rule.community.slug matches created community slug",
    rule.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "rule.community.id matches created community id",
    rule.community.id,
    community.id,
  );

  // 4. Register an adminUser (join) & authenticate as admin
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: typia.random<ICommunityPlatformAdminUserJoin.IRequest>(),
    });
  typia.assert(adminAuthorized);

  TestValidator.predicate(
    "adminUser should have a non-empty UUID id",
    () => adminAuthorized.id.length > 0,
  );

  // 5. As adminUser, delete the previously created rule
  await api.functional.communityPlatform.adminUser.communities.rules.erase(
    connection,
    {
      communitySlug: community.slug,
      ruleId: rule.id,
    },
  );

  // There is no GET/list rules endpoint provided to confirm non-existence,
  // so the primary verification is that the delete completes successfully
  // when called by an authenticated admin using the correct communitySlug
  // and ruleId from the member-created rule.
}
