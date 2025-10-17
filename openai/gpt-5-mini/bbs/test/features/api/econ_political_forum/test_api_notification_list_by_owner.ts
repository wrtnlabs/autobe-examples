import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotification";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumNotification";

export async function test_api_notification_list_by_owner(
  connection: api.IConnection,
) {
  // 1) Prepare isolated connections for two users so that SDK sets tokens independently.
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const actorConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create owner user
  const ownerInput = {
    username: `owner_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-12345",
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(ownerConn, {
      body: ownerInput,
    });
  typia.assert(owner);

  // 3) Create actor user
  const actorInput = {
    username: `actor_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-12345",
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const actor: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(actorConn, {
      body: actorInput,
    });
  typia.assert(actor);

  // 4) Choose category_id. IMPORTANT: Replace CATEGORY_ID_FIXTURE with a real seeded category UUID
  // in integrated test environments. Using a generated UUID here is fine for simulator/mock mode,
  // but may fail if the backend enforces referential integrity.
  const CATEGORY_ID_FIXTURE: string | null = null;
  const category_id: string & tags.Format<"uuid"> = (CATEGORY_ID_FIXTURE ??
    typia.random<string & tags.Format<"uuid">>()) satisfies string &
    tags.Format<"uuid"> as string & tags.Format<"uuid">;

  // 5) Actor creates a thread
  const threadBody = {
    category_id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    status: "open",
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      actorConn,
      { body: threadBody },
    );
  typia.assert(thread);

  // 6) Actor creates a post mentioning the owner by username (assumes '@username' mention syntax)
  //    If the backend requires a different mention format, change the content formatting accordingly.
  const mention = `@${owner.username ?? owner.id}`;
  const postBody = {
    thread_id: thread.id,
    content: `${mention} ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      actorConn,
      { body: postBody },
    );
  typia.assert(post);

  // 7) Owner fetches notifications (page 1, limit 20)
  const page: IPageIEconPoliticalForumNotification.ISummary =
    await api.functional.econPoliticalForum.registeredUser.users.notifications.index(
      ownerConn,
      {
        userId: owner.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalForumNotification.IRequest,
      },
    );
  typia.assert(page);

  // 8) Business assertions
  TestValidator.predicate(
    "owner should have at least one notification",
    Array.isArray(page.data) && page.data.length > 0,
  );

  TestValidator.predicate(
    "notification references created post or thread",
    page.data.some(
      (n) => n.related_post_id === post.id || n.related_thread_id === thread.id,
    ),
  );

  const found = page.data.find(
    (n) => n.related_post_id === post.id || n.related_thread_id === thread.id,
  );

  TestValidator.predicate(
    "found notification must include id and created_at",
    found !== undefined &&
      typeof found.id === "string" &&
      typeof found.created_at === "string",
  );

  // If related_post_id is present, assert equality explicitly
  if (
    found &&
    found.related_post_id !== null &&
    found.related_post_id !== undefined
  ) {
    TestValidator.equals(
      "related_post_id matches created post id",
      found.related_post_id,
      post.id,
    );
  }

  TestValidator.predicate(
    "notification should be unread",
    found !== undefined && found.is_read === false,
  );

  // 9) Teardown note: the test harness should reset DB or run inside transaction between tests.
}
