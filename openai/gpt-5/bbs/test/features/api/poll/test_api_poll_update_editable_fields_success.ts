import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import type { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Update editable fields of a post-attached poll while preserving immutable
 * attributes.
 *
 * Steps:
 *
 * 1. Join as a member to obtain authentication (SDK auto-sets Authorization).
 * 2. Create a post to host the poll.
 * 3. Create a single_choice poll with allowVoteChange=true, startAt in near past,
 *    endAt in near future, and 3 options.
 * 4. Update allowed fields via PUT: question, visibility_mode → always_visible,
 *    min_voter_reputation → 10, and extend end_at.
 * 5. Validate response reflects updates, questionType remains unchanged,
 *    timestamps are ISO, and updatedAt advances.
 */
export async function test_api_poll_update_editable_fields_success(
  connection: api.IConnection,
) {
  // 1) Authenticate (join)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
          wordMin: 3,
          wordMax: 8,
        }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Create initial poll (single_choice)
  const now = new Date();
  const startAt = new Date(now.getTime() - 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: {
        question: RandomGenerator.paragraph({ sentences: 6 }),
        questionType: "single_choice",
        visibilityMode: "visible_after_vote",
        expertOnly: false,
        allowVoteChange: true,
        minVoterReputation: 0,
        startAt,
        endAt,
        options: [
          { text: RandomGenerator.paragraph({ sentences: 2 }), position: 0 },
          { text: RandomGenerator.paragraph({ sentences: 2 }), position: 1 },
          { text: RandomGenerator.paragraph({ sentences: 2 }), position: 2 },
        ] satisfies IEconDiscussPollOption.ICreate[],
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 4) Update allowed fields
  const newQuestion = RandomGenerator.paragraph({ sentences: 7 });
  const newVisibility: IEconDiscussPollVisibilityMode = "always_visible";
  const newMinRep = 10; // non-negative int per schema
  const newEndAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const prevUpdatedAtMs = new Date(poll.updatedAt).getTime();

  const updated = await api.functional.econDiscuss.member.posts.poll.update(
    connection,
    {
      postId: post.id,
      body: {
        question: newQuestion,
        visibility_mode: newVisibility,
        min_voter_reputation: newMinRep,
        end_at: newEndAt,
      } satisfies IEconDiscussPoll.IUpdate,
    },
  );
  typia.assert(updated);

  // 5) Validations
  TestValidator.equals(
    "updated poll belongs to same post",
    updated.postId,
    post.id,
  );
  TestValidator.equals("question updated", updated.question, newQuestion);
  TestValidator.equals(
    "visibilityMode updated",
    updated.visibilityMode,
    newVisibility,
  );
  TestValidator.equals(
    "minVoterReputation updated",
    updated.minVoterReputation,
    newMinRep,
  );
  TestValidator.equals(
    "questionType remains unchanged",
    updated.questionType,
    poll.questionType,
  );

  // updatedAt must advance
  const updatedAtMs = new Date(updated.updatedAt).getTime();
  await TestValidator.predicate(
    "updatedAt advanced",
    async () => updatedAtMs > prevUpdatedAtMs,
  );

  // endAt should be at least the requested later time
  if (updated.endAt !== null && updated.endAt !== undefined) {
    const updatedEndAtIso = typia.assert<string & tags.Format<"date-time">>(
      updated.endAt!,
    );
    const updatedEndAtMs = new Date(updatedEndAtIso).getTime();
    const requestedEndAtMs = new Date(newEndAt).getTime();
    TestValidator.predicate(
      "endAt extended to later time",
      updatedEndAtMs >= requestedEndAtMs,
    );
  } else {
    throw new Error("endAt should be defined after update");
  }
}
