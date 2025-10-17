import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostSnapshot";

export async function test_api_post_version_detail_by_version_number(
  connection: api.IConnection,
) {
  /**
   * Validate reading a specific post version snapshot by version number.
   *
   * Flow:
   *
   * 1. Join as a member (obtain auth via SDK-managed token).
   * 2. Create a post (title/body/optional summary).
   * 3. Perform three sequential updates to generate multiple snapshots.
   * 4. Fetch version 2 snapshot and validate:
   *
   *    - Version === 2
   *    - Post and editor IDs match
   *    - Title/body match an expected historical update (first or second update) to
   *         tolerate different versioning start policies (creation vs first
   *         update).
   * 5. Negative: requesting a non-existent version should throw an error.
   */
  // 1) Join as a member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // >= 8 chars
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // 2) Create a post
  const initialTitle = `Initial ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const initialBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 10,
  });
  const created = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: initialTitle,
        body: initialBody,
        summary: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(created);

  // 3) Perform sequential updates to produce multiple versions
  const u1Title = `Update#1 ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const u1Body = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
  });
  const afterU1 = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: created.id,
      body: {
        title: u1Title,
        body: u1Body,
      } satisfies IEconDiscussPost.IUpdate,
    },
  );
  typia.assert(afterU1);

  const u2Title = `Update#2 ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const u2Body = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
  });
  const afterU2 = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: created.id,
      body: {
        title: u2Title,
        body: u2Body,
      } satisfies IEconDiscussPost.IUpdate,
    },
  );
  typia.assert(afterU2);

  const u3Title = `Update#3 ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const u3Body = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
  });
  const afterU3 = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: created.id,
      body: {
        title: u3Title,
        body: u3Body,
      } satisfies IEconDiscussPost.IUpdate,
    },
  );
  typia.assert(afterU3);

  // 4) Fetch version=2 snapshot and validate
  const snapshot = await api.functional.econDiscuss.posts.versions.at(
    connection,
    {
      postId: created.id,
      version: 2,
    },
  );
  typia.assert(snapshot);

  TestValidator.equals(
    "snapshot belongs to created post",
    snapshot.econ_discuss_post_id,
    created.id,
  );
  TestValidator.equals(
    "snapshot editor equals authenticated member",
    snapshot.econ_discuss_user_id,
    member.id,
  );
  TestValidator.equals("snapshot version is 2", snapshot.version, 2);

  const matchesUpdate1 = snapshot.title === u1Title && snapshot.body === u1Body;
  const matchesUpdate2 = snapshot.title === u2Title && snapshot.body === u2Body;
  TestValidator.predicate(
    "version 2 content matches either first or second update (policy tolerant)",
    matchesUpdate1 || matchesUpdate2,
  );

  // 5) Negative: non-existent version must error
  await TestValidator.error(
    "requesting non-existent post version should fail",
    async () => {
      await api.functional.econDiscuss.posts.versions.at(connection, {
        postId: created.id,
        version: 999999,
      });
    },
  );
}
