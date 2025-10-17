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
 * Create a member, create a populated draft, and verify its listing visibility.
 *
 * Business flow:
 *
 * 1. Authentication boundary: calling GET /econDiscuss/member/drafts without
 *    credentials should error (protected endpoint).
 * 2. Join as a member via /auth/member/join (IEconDiscussMember.ICreate). The SDK
 *    injects Authorization token to the connection automatically on success.
 * 3. Create a draft via POST /econDiscuss/member/drafts with both title and body
 *    (IEconDiscussPostDraft.ICreate).
 * 4. List drafts via GET /econDiscuss/member/drafts and verify the created draft
 *    appears and is ordered first by updated_at desc.
 */
export async function test_api_drafts_creation_with_content_and_list_visibility(
  connection: api.IConnection,
) {
  // 1) Authentication boundary: unauthenticated listing should be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated member drafts listing should be rejected",
    async () => {
      await api.functional.econDiscuss.member.drafts.search(unauthConn);
    },
  );

  // 2) Join as member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 3) Create a draft with populated title and body
  const draftCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IEconDiscussPostDraft.ICreate;
  const created = await api.functional.econDiscuss.member.drafts.create(
    connection,
    { body: draftCreateBody },
  );
  typia.assert(created);

  // Business validations on fields (no extra type checks beyond typia.assert)
  TestValidator.equals(
    "created draft returns the same title as input",
    created.title,
    draftCreateBody.title,
  );
  TestValidator.equals(
    "created draft returns the same body as input",
    created.body,
    draftCreateBody.body,
  );

  // 4) List drafts and verify appearance and ordering
  const page =
    await api.functional.econDiscuss.member.drafts.search(connection);
  typia.assert(page);

  const index = page.data.findIndex((d) => d.id === created.id);
  TestValidator.predicate("created draft exists in listing data", index >= 0);
  TestValidator.equals(
    "most recently updated draft should be first in listing",
    page.data[0]?.id,
    created.id,
  );
}
