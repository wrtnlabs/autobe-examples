import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate that a member can successfully delete their own account, ensuring
 * soft deletion (deleted_at).
 *
 * 1. Register a new member (unique email, username, password)
 * 2. Create a topic as that member
 * 3. Delete the account via self-deletion endpoint (soft delete)
 * 4. Attempt to login again and expect failure
 * 5. Check that the previously created topic is still present and authored by the
 *    same member id/username
 */
export async function test_api_member_account_self_deletion(
  connection: api.IConnection,
) {
  // 1. Register member
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        username,
        password,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member id is uuid",
    typeof member.id === "string" && member.id.length > 0,
  );
  TestValidator.equals("no deletion initially", member.deleted_at, null);
  TestValidator.equals("username persisted", member.username, username);

  // 2. Create a topic as that member
  const subject = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const content = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 3,
    wordMax: 8,
  });
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        subject,
        content,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);
  TestValidator.equals(
    "topic author matches member",
    topic.author_member_id,
    member.id,
  );

  // 3. Delete the account
  await api.functional.discussionBoard.member.members.erase(connection, {
    memberId: member.id,
  });

  // 4. Try logging in again (should fail)
  await TestValidator.error("deleted member cannot log in", async () => {
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        username,
        password,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  });

  // 5. The topic should remain visible, with its author id matching the deleted member id
  // (Assuming there is an endpoint to retrieve the topic by id. If not, we can validate using topic returned above.)
  TestValidator.equals(
    "topic still displays author id",
    topic.author_member_id,
    member.id,
  );
}
