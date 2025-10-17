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
 * Create a member, then create a minimal autosave-ready draft and verify it
 * appears in listings.
 *
 * Steps
 *
 * 1. Join as a new member (SDK sets Authorization token automatically)
 * 2. Create a draft with minimal payload (title=null, body=null)
 * 3. Assert creation response type and nullish fields
 * 4. List my drafts and assert the newly created draft appears in the first page
 */
export async function test_api_drafts_creation_minimal_payload_autosave_ready(
  connection: api.IConnection,
) {
  // 1) Join as a new member (auth token handled by SDK)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Create a draft with minimal payload (explicit nulls to exercise autosave-ready schema)
  const createDraftBody = {
    title: null,
    body: null,
  } satisfies IEconDiscussPostDraft.ICreate;
  const created: IEconDiscussPostDraft =
    await api.functional.econDiscuss.member.drafts.create(connection, {
      body: createDraftBody,
    });
  typia.assert(created);

  // 3) Basic validations on created entity (nullish content allowed by design)
  TestValidator.predicate(
    "created draft has nullish title",
    created.title === null || created.title === undefined,
  );
  TestValidator.predicate(
    "created draft has nullish body",
    created.body === null || created.body === undefined,
  );
  TestValidator.predicate(
    "created draft has no published post linkage yet",
    created.post_id === null || created.post_id === undefined,
  );

  // 4) List my drafts and ensure the new draft appears in the first page
  const page: IPageIEconDiscussPostDraft =
    await api.functional.econDiscuss.member.drafts.search(connection);
  typia.assert(page);

  const existsInPage: boolean = page.data.some((d) => d.id === created.id);
  TestValidator.predicate(
    "newly created draft appears in listing",
    existsInPage,
  );
}
