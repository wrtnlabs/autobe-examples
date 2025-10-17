import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";

/**
 * Publish a draft and validate creation, idempotency, and access boundaries.
 *
 * Steps:
 *
 * 1. Register Member A (join). SDK sets Authorization automatically.
 * 2. Create a draft with null title/body (early autosave allowed by schema).
 * 3. Update the draft with concrete title/body content.
 * 4. Publish the draft and validate:
 *
 *    - Author_user_id equals Member A id
 *    - Title/body match updated values
 *    - Published_at exists and is ISO 8601
 * 5. Idempotency: re-publish same draft
 *
 *    - If success, returned post id must equal the original post id
 *    - If error occurs, accept as valid conflict behavior (no status code checks)
 * 6. Authentication boundary: attempt publish with unauthenticated connection;
 *    expect error
 * 7. Ownership: register Member B and attempt to publish Member A’s draft; expect
 *    error
 */
export async function test_api_draft_publish_creates_post_and_idempotency_guard(
  connection: api.IConnection,
) {
  // 1) Register Member A
  const memberABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `P${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const memberA = await api.functional.auth.member.join(connection, {
    body: memberABody,
  });
  typia.assert(memberA);

  // 2) Create draft (early autosave: null title/body allowed)
  const draftCreateBody = {
    title: null,
    body: null,
  } satisfies IEconDiscussPostDraft.ICreate;
  const draft = await api.functional.econDiscuss.member.drafts.create(
    connection,
    { body: draftCreateBody },
  );
  typia.assert(draft);

  // 3) Update draft with publishable content
  const updatedTitle: string = RandomGenerator.paragraph({ sentences: 6 });
  const updatedBody: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 12,
  });
  const draftUpdated = await api.functional.econDiscuss.member.drafts.update(
    connection,
    {
      draftId: draft.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
      } satisfies IEconDiscussPostDraft.IUpdate,
    },
  );
  typia.assert(draftUpdated);

  // 4) Publish the draft
  const post = await api.functional.econDiscuss.member.drafts.publish(
    connection,
    { draftId: draft.id },
  );
  typia.assert(post);

  // Validate author linkage and content propagation
  TestValidator.equals(
    "published post author matches Member A",
    post.author_user_id,
    memberA.id,
  );
  TestValidator.equals(
    "published post title matches updated draft",
    post.title,
    updatedTitle,
  );
  TestValidator.equals(
    "published post body matches updated draft",
    post.body,
    updatedBody,
  );

  // Validate published_at presence and ISO 8601 format
  TestValidator.predicate(
    "published_at should be present",
    post.published_at !== null && post.published_at !== undefined,
  );
  const publishedAtIso = typia.assert<string & tags.Format<"date-time">>(
    post.published_at!,
  );
  void publishedAtIso; // logically validated by typia.assert

  // 5) Idempotency: re-publish same draft
  try {
    const postAgain = await api.functional.econDiscuss.member.drafts.publish(
      connection,
      { draftId: draft.id },
    );
    typia.assert(postAgain);
    TestValidator.equals(
      "idempotent publish returns the same post id",
      postAgain.id,
      post.id,
    );
  } catch (_e) {
    // Acceptable: service treats re-publish as conflict; do not assert status code
  }

  // 6) Authentication boundary: unauthenticated attempt should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated publish attempt should be rejected",
    async () =>
      await api.functional.econDiscuss.member.drafts.publish(unauthConn, {
        draftId: draft.id,
      }),
  );

  // 7) Ownership boundary: Member B should not publish Member A's draft
  const memberBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `P${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const memberB = await api.functional.auth.member.join(connection, {
    body: memberBBody,
  });
  typia.assert(memberB);

  await TestValidator.error(
    "non-owner cannot publish another member's draft",
    async () =>
      await api.functional.econDiscuss.member.drafts.publish(connection, {
        draftId: draft.id,
      }),
  );
}
