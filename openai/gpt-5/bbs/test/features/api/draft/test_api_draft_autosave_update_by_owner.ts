import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";

/**
 * Validate that a draft owner can autosave updates to title/body and that
 * lifecycle and authorization rules are enforced.
 *
 * Steps:
 *
 * 1. Register owner (join) to obtain an authenticated connection.
 * 2. Create a draft and capture draftId, created_at, and updated_at.
 * 3. Update the draft as the owner; verify title/body updated and updated_at
 *    increased.
 * 4. Authentication boundary: attempt update without Authorization; expect error.
 * 5. Ownership rule: another member attempts update; expect error.
 * 6. Lifecycle: owner discards the draft; subsequent update attempts should fail.
 */
export async function test_api_draft_autosave_update_by_owner(
  connection: api.IConnection,
) {
  // Prepare separate connections to avoid manual header manipulation
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 1) Owner authentication (join)
  const ownerAuth = await api.functional.auth.member.join(ownerConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // >= 8 chars
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(ownerAuth);

  // 2) Create a draft
  const createdDraft = await api.functional.econDiscuss.member.drafts.create(
    ownerConn,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 6,
          sentenceMax: 12,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies IEconDiscussPostDraft.ICreate,
    },
  );
  typia.assert(createdDraft);

  const previousUpdatedAtMs = new Date(createdDraft.updated_at).getTime();

  // 3) Update the draft as the owner
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IEconDiscussPostDraft.IUpdate;

  const updatedDraft = await api.functional.econDiscuss.member.drafts.update(
    ownerConn,
    {
      draftId: createdDraft.id,
      body: updateBody,
    },
  );
  typia.assert(updatedDraft);

  // Validate ID unchanged and fields updated
  TestValidator.equals(
    "draft id preserved after update",
    updatedDraft.id,
    createdDraft.id,
  );
  TestValidator.equals(
    "title is reflected after update",
    updatedDraft.title,
    updateBody.title,
  );
  TestValidator.equals(
    "body is reflected after update",
    updatedDraft.body,
    updateBody.body,
  );

  // Validate updated_at progression and ISO handled by typia.assert
  const newUpdatedAtMs = new Date(updatedDraft.updated_at).getTime();
  TestValidator.predicate(
    "updated_at increased after update",
    newUpdatedAtMs > previousUpdatedAtMs,
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(updatedDraft.updated_at).getTime() >=
      new Date(updatedDraft.created_at).getTime(),
  );

  // 4) Authentication boundary: unauthenticated update must fail
  await TestValidator.error(
    "unauthenticated user cannot update a draft",
    async () => {
      await api.functional.econDiscuss.member.drafts.update(unauthConn, {
        draftId: createdDraft.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconDiscussPostDraft.IUpdate,
      });
    },
  );

  // 5) Ownership rule: another authenticated member cannot update owner's draft
  const otherAuth = await api.functional.auth.member.join(otherConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(otherAuth);

  await TestValidator.error(
    "non-owner cannot update someone else's draft",
    async () => {
      await api.functional.econDiscuss.member.drafts.update(otherConn, {
        draftId: createdDraft.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEconDiscussPostDraft.IUpdate,
      });
    },
  );

  // 6) Lifecycle discard: owner discards the draft, then further updates fail
  await api.functional.econDiscuss.member.drafts.erase(ownerConn, {
    draftId: createdDraft.id,
  });

  await TestValidator.error(
    "updating a discarded draft should fail",
    async () => {
      await api.functional.econDiscuss.member.drafts.update(ownerConn, {
        draftId: createdDraft.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconDiscussPostDraft.IUpdate,
      });
    },
  );
}
