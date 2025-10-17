import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";

/**
 * Ensure a discarded draft is not retrievable by its owner.
 *
 * Business context:
 *
 * - Drafts are private autosave artifacts. Discarding performs a soft-delete
 *   (sets deleted_at) and hides them from subsequent retrievals.
 *
 * Test flow:
 *
 * 1. Join as Member (acquire Authorization automatically by SDK)
 * 2. Create a draft and capture its id
 * 3. GET the draft once to confirm it exists and is retrievable pre-discard
 * 4. DELETE (discard) the draft
 * 5. GET again and assert the operation fails (not found/hidden policy)
 *
 * Validation strategy:
 *
 * - Typia.assert on non-void responses
 * - Business rule checks via TestValidator.equals and TestValidator.error
 */
export async function test_api_drafts_detail_not_found_after_discard(
  connection: api.IConnection,
) {
  // 1) Join as Member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Optional equality check if member snapshot exists
  if (authorized.member !== undefined) {
    TestValidator.equals(
      "authorized.member.id matches authorized.id",
      authorized.member.id,
      authorized.id,
    );
  }

  // 2) Create a draft
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPostDraft.ICreate;
  const created = await api.functional.econDiscuss.member.drafts.create(
    connection,
    { body: createBody },
  );
  typia.assert(created);

  // 3) Sanity: GET the draft before discard
  const fetched = await api.functional.econDiscuss.member.drafts.at(
    connection,
    { draftId: created.id },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "fetched draft id equals created draft id",
    fetched.id,
    created.id,
  );

  // 4) Discard the draft
  await api.functional.econDiscuss.member.drafts.erase(connection, {
    draftId: created.id,
  });

  // 5) Confirm not found behavior after discard
  await TestValidator.error(
    "discarded draft should not be retrievable",
    async () => {
      await api.functional.econDiscuss.member.drafts.at(connection, {
        draftId: created.id,
      });
    },
  );
}
