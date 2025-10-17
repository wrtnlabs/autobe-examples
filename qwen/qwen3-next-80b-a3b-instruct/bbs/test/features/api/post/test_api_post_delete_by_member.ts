import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_delete_by_member(
  connection: api.IConnection,
) {
  // 1. Create a new topic for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation", // Valid topic from enum
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 2. Authenticate a member (NOT admin)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashedpassword123", // Valid format
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 3. Create a post as the member
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Try to delete the post as member (should fail with 403 Forbidden)
  // Note: We don't validate the exact HTTP status code per CRITICAL rule 12, just validate the error condition
  await TestValidator.error(
    "member should be forbidden from using admin delete endpoint",
    async () => {
      await api.functional.economicBoard.admin.posts.erase(connection, {
        postId: post.id, // Using the post ID created above
      });
    },
  );
}
