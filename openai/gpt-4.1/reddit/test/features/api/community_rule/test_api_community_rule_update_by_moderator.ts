import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that a moderator can update an existing community moderation rule
 * they manage, enforcing update semantics and permission boundaries.
 *
 * - Register user and login
 * - Create a new community as user (user becomes initial moderator)
 * - Register another legitimate moderator and login
 * - Authenticated as legit moderator, create moderation rule
 * - Update rule's fields: description, display_order, enforced
 * - Validate change is persisted
 * - Auth as unrelated moderator: update must fail
 * - Auth as plain user: update must fail
 * - Attempt invalid/double update: must fail/validate constraints
 */
export async function test_api_community_rule_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register a user, login as user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "pw-" + RandomGenerator.alphaNumeric(10);
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);

  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
      href: "https://localhost/test_login",
      referrer: "https://localhost",
    } satisfies ICommunityPlatformUser.ILogin,
  }); // session context for next create

  // Step 2: User creates a community
  const communityName = RandomGenerator.alphaNumeric(12);
  const communityCreate = {
    name: communityName as string & tags.MinLength<3> & tags.MaxLength<30>,
    display_title: RandomGenerator.name(3) as string &
      tags.MinLength<1> &
      tags.MaxLength<100>,
    description: RandomGenerator.content({ paragraphs: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<2000>,
    visibility: RandomGenerator.pick([
      "public",
      "private",
      "invite-only",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "archived",
      "banned",
      "pending approval",
    ] as const),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Register second moderator (unrelated, will check permission boundary)
  const otherModEmail = "mod2-" + RandomGenerator.alphaNumeric(8) + "@test.com";
  const otherModPassword = "pw-" + RandomGenerator.alphaNumeric(10);
  const otherModAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: otherModEmail as string & tags.Format<"email">,
      password: otherModPassword,
      status: "active",
      href: "https://localhost/register_mod",
      referrer: "https://localhost",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(otherModAuth);

  // Step 4: Register and login as the 'main' legitimate moderator
  const mainModEmail = "mod1-" + RandomGenerator.alphaNumeric(8) + "@test.com";
  const mainModPassword = "pw-" + RandomGenerator.alphaNumeric(10);
  const mainModAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: mainModEmail as string & tags.Format<"email">,
      password: mainModPassword,
      status: "active",
      href: "https://localhost/register_mod",
      referrer: "https://localhost",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(mainModAuth);
  // login as main moderator to get session
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: mainModEmail as string & tags.Format<"email">,
      password: mainModPassword as string & tags.Format<"password">,
      href: "https://localhost/login_mod",
      referrer: "https://localhost",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Create an initial moderation rule via legitimate moderator
  const ruleCode = "RULE-" + RandomGenerator.alphaNumeric(6).toUpperCase();
  const ruleBody = {
    code: ruleCode,
    description: "No promotion of unrelated products allowed.",
    display_order: 1 as number & tags.Type<"int32">,
    enforced: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;
  const rule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityName: communityName,
        body: ruleBody,
      },
    );
  typia.assert(rule);
  TestValidator.equals("persisted rule code", rule.code, ruleCode);
  TestValidator.equals("persisted enforced", rule.enforced, true);

  // Step 6: Update the rule fields as authorized moderator
  const updateBody = {
    description: "Unrelated commercial promotions are strictly prohibited.",
    display_order: 2 as number & tags.Type<"int32">,
    enforced: false,
  } satisfies ICommunityPlatformCommunityRule.IUpdate;
  const updated =
    await api.functional.communityPlatform.moderator.communities.rules.update(
      connection,
      {
        communityName: communityName,
        ruleCode: ruleCode,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated code remains", updated.code, ruleCode);
  TestValidator.equals(
    "updated description",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated display_order",
    updated.display_order,
    updateBody.display_order,
  );
  TestValidator.equals(
    "updated enforced",
    updated.enforced,
    updateBody.enforced,
  );

  // Step 7: Login as the unrelated moderator and attempt update (should fail)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: otherModEmail as string & tags.Format<"email">,
      password: otherModPassword as string & tags.Format<"password">,
      href: "https://localhost/login_mod2",
      referrer: "https://localhost",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  await TestValidator.error(
    "permission denied: unrelated moderator cannot update rule",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.update(
        connection,
        {
          communityName: communityName,
          ruleCode: ruleCode,
          body: {
            description: "Trying update as unauthorized moderator",
          },
        },
      );
    },
  );

  // Step 8: Login as plain user and try update (should fail)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
      href: "https://localhost/userlogin_attempt",
      referrer: "https://localhost",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  await TestValidator.error(
    "permission denied: user cannot update community rules",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.update(
        connection,
        {
          communityName: communityName,
          ruleCode: ruleCode,
          body: {
            enforced: true,
          },
        },
      );
    },
  );

  // Step 9: Attempt update on non-existent rule (should fail)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: mainModEmail as string & tags.Format<"email">,
      password: mainModPassword as string & tags.Format<"password">,
      href: "https://localhost/login_mod",
      referrer: "https://localhost",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  await TestValidator.error("update fails for missing rule code", async () => {
    await api.functional.communityPlatform.moderator.communities.rules.update(
      connection,
      {
        communityName: communityName,
        ruleCode: "NOT-EXISTING" + RandomGenerator.alphaNumeric(6),
        body: {
          enforced: true,
        },
      },
    );
  });
}
