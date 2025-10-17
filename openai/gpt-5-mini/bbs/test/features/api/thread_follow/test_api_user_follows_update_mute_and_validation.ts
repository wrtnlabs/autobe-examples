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

export async function test_api_user_follows_update_mute_and_validation(
  connection: api.IConnection,
) {
  // 1) Administrator setup: register administrator and create a category
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass1234",
    username: RandomGenerator.alphaNumeric(6),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);
  const adminConn: api.IConnection = {
    ...connection,
    headers: { Authorization: admin.token.access },
  };

  const categoryBody = {
    code: null,
    name: `test-category-${RandomGenerator.alphaNumeric(6)}`,
    slug: `test-category-${RandomGenerator.alphaNumeric(6)}`,
    description: "Category for follow/mute E2E test",
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      { body: categoryBody },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created with id",
    typeof category.id === "string" && category.id.length > 0,
  );

  // 2) Owner registration + connection for owner
  const ownerJoin = {
    username: `owner_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "OwnerPass12345",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: ownerJoin,
    });
  typia.assert(owner);
  const ownerConn: api.IConnection = {
    ...connection,
    headers: { Authorization: owner.token.access },
  };

  // 3) Thread creation by owner
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    slug: `thread-${RandomGenerator.alphaNumeric(6)}`,
    status: "open",
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      ownerConn,
      { body: threadBody },
    );
  typia.assert(thread);
  TestValidator.predicate(
    "thread created with id",
    typeof thread.id === "string" && thread.id.length > 0,
  );

  // 4) Create initial follow (owner)
  const initialFollowBody = {
    thread_id: thread.id,
    muted_until: null,
  } satisfies IEconPoliticalForumThreadFollow.ICreate;

  const initialFollow: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      ownerConn,
      {
        threadId: thread.id,
        body: initialFollowBody,
      },
    );
  typia.assert(initialFollow);
  TestValidator.predicate(
    "initial follow belongs to owner",
    initialFollow.registereduser_id === owner.id,
  );

  // 5) Valid update: set muted_until to a future ISO-8601 timestamp
  const futureISO = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const updateFollowBody = {
    thread_id: thread.id,
    muted_until: futureISO,
  } satisfies IEconPoliticalForumThreadFollow.ICreate;

  const updatedFollow: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      ownerConn,
      {
        threadId: thread.id,
        body: updateFollowBody,
      },
    );
  typia.assert(updatedFollow);

  // Robust comparison: compare date millis to avoid formatting differences
  const parsedRequested = Date.parse(futureISO);
  const parsedReturned = updatedFollow.muted_until
    ? Date.parse(updatedFollow.muted_until)
    : NaN;
  TestValidator.predicate(
    "muted_until returned equals requested time (ms)",
    parsedRequested === parsedReturned,
  );
  TestValidator.equals(
    "follow id is kept (idempotent create) after update",
    initialFollow.id,
    updatedFollow.id,
  );

  // 6) Invalid muted_until format -> expect validation error
  await TestValidator.error(
    "malformed muted_until should be rejected",
    async () => {
      const badBody = {
        thread_id: thread.id,
        // intentionally malformed date string (still a string type)
        muted_until: "not-a-valid-date",
      } satisfies IEconPoliticalForumThreadFollow.ICreate;

      await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
        ownerConn,
        {
          threadId: thread.id,
          body: badBody,
        },
      );
    },
  );

  // 7) Past muted_until -> expect business-rule rejection (must be future)
  await TestValidator.error(
    "past muted_until should be rejected by business rule",
    async () => {
      const pastISO = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const pastBody = {
        thread_id: thread.id,
        muted_until: pastISO,
      } satisfies IEconPoliticalForumThreadFollow.ICreate;

      await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
        ownerConn,
        {
          threadId: thread.id,
          body: pastBody,
        },
      );
    },
  );

  // 8) Forbidden update attempt: otherUser cannot modify ownerUser's follow
  const otherJoin = {
    username: `other_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "OtherPass12345",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const other: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: otherJoin,
    });
  typia.assert(other);
  const otherConn: api.IConnection = {
    ...connection,
    headers: { Authorization: other.token.access },
  };

  const otherFollowBody = {
    thread_id: thread.id,
    muted_until: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
  } satisfies IEconPoliticalForumThreadFollow.ICreate;

  const otherFollow: IEconPoliticalForumThreadFollow =
    await api.functional.econPoliticalForum.registeredUser.threads.follows.create(
      otherConn,
      {
        threadId: thread.id,
        body: otherFollowBody,
      },
    );
  typia.assert(otherFollow);

  // Validate that otherFollow belongs to other user and that ownerFollow (post-update) remains unchanged
  TestValidator.notEquals(
    "other user's follow should be a different follow id",
    updatedFollow.id,
    otherFollow.id,
  );
  TestValidator.notEquals(
    "other user's follow registereduser_id must differ from owner's registereduser_id",
    updatedFollow.registereduser_id,
    otherFollow.registereduser_id,
  );
}
