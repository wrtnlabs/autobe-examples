import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_reply_update_nonexistent_reply(
  connection: api.IConnection,
) {
  // 1. Create a new member account for authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a topic that will be associated with the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation", // One of the 7 predefined topics
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a published post under this topic
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Analysis of current economic trends",
        content:
          "This is a detailed analysis of inflation rates and their impact on the economy.\n\nVarious factors including monetary policy, supply chain issues, and labor market dynamics are contributing to the current inflationary pressures.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Attempt to update a reply that does not exist with the valid post ID
  // This should result in a 404 Not Found error
  await TestValidator.error(
    "should return 404 when updating non-existent reply",
    async () => {
      await api.functional.economicBoard.member.posts.replies.update(
        connection,
        {
          postId: post.id,
          replyId: "00000000-0000-0000-0000-000000000000", // Invalid, non-existing reply ID
          body: {
            content: "This is an updated reply content",
          } satisfies IEconomicBoardReply.IUpdate,
        },
      );
    },
  );
}
