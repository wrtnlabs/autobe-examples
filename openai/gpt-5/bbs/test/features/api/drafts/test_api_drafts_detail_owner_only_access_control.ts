import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";

/**
 * Draft detail retrieval must be owner-only.
 *
 * This test verifies that a private draft is only retrievable by its owner. It
 * establishes two separate authenticated member contexts using distinct
 * IConnection instances (connA and connB) so that SDK-managed tokens remain
 * isolated without directly touching headers. The flow is:
 *
 * 1. Join as Member A (connA)
 * 2. Create a draft under Member A
 * 3. Join as Member B (connB)
 * 4. Attempt to GET the draft with Member B (expect error)
 * 5. GET the draft with Member A (expect success) and validate fields
 */
export async function test_api_drafts_detail_owner_only_access_control(
  connection: api.IConnection,
) {
  // Create isolated connections for two members without touching headers later
  const connA: api.IConnection = { ...connection, headers: {} };
  const connB: api.IConnection = { ...connection, headers: {} };

  // 1) Join as Member A
  const joinABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authA = await api.functional.auth.member.join(connA, {
    body: joinABody,
  });
  typia.assert(authA);

  // 2) Create a draft under Member A
  const createDraftBody = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 14,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IEconDiscussPostDraft.ICreate;
  const createdDraft = await api.functional.econDiscuss.member.drafts.create(
    connA,
    {
      body: createDraftBody,
    },
  );
  typia.assert(createdDraft);

  // 3) Join as Member B (separate user context)
  const joinBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authB = await api.functional.auth.member.join(connB, {
    body: joinBBody,
  });
  typia.assert(authB);

  // 4) Non-owner tries to fetch the draft -> must fail
  await TestValidator.error(
    "non-owner cannot retrieve someone else's draft",
    async () => {
      await api.functional.econDiscuss.member.drafts.at(connB, {
        draftId: createdDraft.id,
      });
    },
  );

  // 5) Owner fetches the draft -> must succeed
  const fetchedByOwner = await api.functional.econDiscuss.member.drafts.at(
    connA,
    {
      draftId: createdDraft.id,
    },
  );
  typia.assert(fetchedByOwner);

  // Validate identity and basic persistence
  TestValidator.equals(
    "fetched draft id should equal created draft id",
    fetchedByOwner.id,
    createdDraft.id,
  );
  TestValidator.equals(
    "persisted title should be preserved",
    fetchedByOwner.title,
    createdDraft.title,
  );
  TestValidator.equals(
    "persisted body should be preserved",
    fetchedByOwner.body,
    createdDraft.body,
  );
}
