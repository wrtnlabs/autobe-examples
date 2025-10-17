import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostDraft";

/**
 * Validate draft discard (soft-delete) including idempotency, list exclusion,
 * ownership, and auth boundary.
 *
 * Flow
 *
 * 1. Join Member A and create a draft
 * 2. List drafts and verify the created draft is present
 * 3. DELETE the draft as owner (Member A) → ensure excluded from subsequent list
 * 4. Idempotency: DELETE again → accept success or error; in either case, list
 *    must still exclude the draft
 * 5. Ownership: Join Member B and attempt to DELETE Member A’s draft → expect
 *    error
 * 6. Authentication boundary: attempt DELETE without Authorization → expect error
 */
export async function test_api_draft_discard_idempotent_and_ownership(
  connection: api.IConnection,
) {
  // 1) Join Member A (authentication is auto-installed by SDK on connection)
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // >= 8 chars
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberA);

  // Create a draft under Member A
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 12,
    }),
  } satisfies IEconDiscussPostDraft.ICreate;
  const draft = await api.functional.econDiscuss.member.drafts.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(draft);

  // 2) Verify draft appears in listing before deletion
  const listBefore =
    await api.functional.econDiscuss.member.drafts.search(connection);
  typia.assert(listBefore);
  const existsBefore = listBefore.data.some((d) => d.id === draft.id);
  TestValidator.predicate(
    "draft appears in list before deletion",
    existsBefore,
  );

  // 3) DELETE the draft as owner (Member A)
  await api.functional.econDiscuss.member.drafts.erase(connection, {
    draftId: draft.id,
  });

  // Verify exclusion after deletion
  const listAfter =
    await api.functional.econDiscuss.member.drafts.search(connection);
  typia.assert(listAfter);
  const excludedAfter = listAfter.data.some((d) => d.id === draft.id) === false;
  TestValidator.predicate(
    "draft excluded from list after deletion",
    excludedAfter,
  );

  // 4) Idempotency: attempt DELETE again; accept either success or error
  try {
    await api.functional.econDiscuss.member.drafts.erase(connection, {
      draftId: draft.id,
    });
  } catch {
    // acceptable: already discarded → implementations may return error
  }
  const listAfterSecond =
    await api.functional.econDiscuss.member.drafts.search(connection);
  typia.assert(listAfterSecond);
  const stillExcluded =
    listAfterSecond.data.some((d) => d.id === draft.id) === false;
  TestValidator.predicate(
    "draft remains excluded after second deletion attempt",
    stillExcluded,
  );

  // 5) Ownership: Join Member B and attempt to delete Member A’s draft
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10), // >= 8 chars
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberB);

  await TestValidator.error(
    "non-owner cannot discard another user's draft",
    async () => {
      await api.functional.econDiscuss.member.drafts.erase(connection, {
        draftId: draft.id,
      });
    },
  );

  // 6) Authentication boundary: unauthenticated delete must be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deletion is rejected",
    async () => {
      await api.functional.econDiscuss.member.drafts.erase(unauthConn, {
        draftId: draft.id,
      });
    },
  );
}
