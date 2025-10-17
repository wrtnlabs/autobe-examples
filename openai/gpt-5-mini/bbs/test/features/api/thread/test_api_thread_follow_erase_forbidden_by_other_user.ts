import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IEconPoliticalForumThreadFollow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThreadFollow";

export async function test_api_thread_follow_erase_forbidden_by_other_user(
  connection: api.IConnection,
) {
  /**
   * Purpose: Ensure that a registered user (attacker) cannot erase another
   * user's follow record. The test covers the full setup: admin creates a
   * category, owner registers and creates a thread and a follow, attacker
   * registers and attempts the forbidden erase. The expected result is a 403
   * Forbidden and no mutation to the follow record.
   */

  // 1) Administrator registration (to create category)
  const adminEmail = `${RandomGenerator.alphaNumeric(6).toLowerCase()}@example.com`;
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd-Admin1",
        username: RandomGenerator.alphaNumeric(8).toLowerCase(),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create category as administrator
  const categoryBody = {
    code: null,
    name: `cat-${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
    slug: `cat-${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
    description: "Automated test category",
    is_moderated: false,
    requires_verification: false,
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3) Owner (registered user A) registration
  const ownerUsername = `owner_${RandomGenerator.alphaNumeric(6).toLowerCase()}`;
  const ownerEmail = `${RandomGenerator.alphaNumeric(6).toLowerCase()}@example.com`;
  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: ownerUsername,
        email: ownerEmail,
        password: "P@ssw0rdOwner1",
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(owner);

  // 4) Owner creates a thread in the created category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    slug: `t-${RandomGenerator.alphaNumeric(8).toLowerCase()}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);

  // 5) Owner creates a follow for that thread
  const followCreateBody = {
    thread_id: thread.id,
    muted_until: null,
  } satisfies IEconPoliticalForumThreadFollow.ICreate;

  const follow: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      connection,
      {
        threadId: thread.id,
        body: followCreateBody,
      },
    );
  typia.assert(follow);

  // Basic invariants: owner is the follow owner, follow not deleted
  TestValidator.equals(
    "follow owner matches thread creator",
    follow.registereduser_id,
    owner.id,
  );
  TestValidator.predicate(
    "follow not soft-deleted after creation",
    follow.deleted_at === null || follow.deleted_at === undefined,
  );

  // 6) Attacker (registered user B) registration
  const attackerUsername = `att_${RandomGenerator.alphaNumeric(6).toLowerCase()}`;
  const attackerEmail = `${RandomGenerator.alphaNumeric(6).toLowerCase()}@example.com`;
  const attacker: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: attackerUsername,
        email: attackerEmail,
        password: "P@ssw0rdAtt1",
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(attacker);

  // 7) Unauthorized delete attempt by attacker: expect HTTP 403
  await TestValidator.error(
    "attacker cannot erase another user's follow (403)",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.threads.follows.erase(
        connection,
        {
          threadId: thread.id,
          followId: follow.id,
        },
      );
    },
  );

  // 8) Post-conditions: follow must still be owned by owner and not deleted
  TestValidator.equals(
    "follow still owned by original user",
    follow.registereduser_id,
    owner.id,
  );
  TestValidator.predicate(
    "follow still not soft-deleted after unauthorized attempt",
    follow.deleted_at === null || follow.deleted_at === undefined,
  );
}
